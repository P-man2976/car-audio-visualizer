import { createFileRoute } from "@tanstack/react-router";

const RADIKO_BASE = "https://radiko.jp";
const AUTH_KEY = "bcd151073c03b352e1ef2fd66c32209da9ca0afa";

export const Route = createFileRoute("/api/radiko/auth")({
	server: {
		handlers: {
			// auth1 + auth2 を同一 Worker インスタンス上で完結させる。
			// Radiko はトークンを auth1 の送信元 IP に紐付けるため、
			// auth1/auth2 を別リクエストでプロキシすると異なるエッジノードに
			// 振り分けられて 400 になることがある。
			GET: async ({ request }) => {
				const clientIp = new URL(request.url).searchParams.get("ip") ?? "";
				if (!clientIp) {
					return new Response(
						JSON.stringify({ error: "Missing ip query parameter" }),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				// --- auth1 ---
				const resAuth1 = await fetch(`${RADIKO_BASE}/v2/api/auth1`, {
					headers: {
						"X-Radiko-App": "pc_html5",
						"X-Radiko-App-Version": "0.0.1",
						"X-Radiko-Device": "pc",
						"X-Radiko-User": "dummy_user",
						"X-Real-IP": clientIp,
					},
				});

				if (!resAuth1.ok) {
					return new Response(
						JSON.stringify({ error: "Auth1 failed", status: resAuth1.status }),
						{ status: 502, headers: { "Content-Type": "application/json" } },
					);
				}

				const authToken = resAuth1.headers.get("x-radiko-authtoken");
				const keyLength = Number(resAuth1.headers.get("x-radiko-keylength"));
				const keyOffset = Number(resAuth1.headers.get("x-radiko-keyoffset"));

				if (!authToken) {
					return new Response(
						JSON.stringify({ error: "No X-Radiko-AuthToken in auth1 response" }),
						{ status: 502, headers: { "Content-Type": "application/json" } },
					);
				}

				// partialKey を Worker 上で計算
				const partialKey = btoa(AUTH_KEY.slice(keyOffset, keyOffset + keyLength));

				// --- auth2 (同一 Worker・同一 IP から送信) ---
				const resAuth2 = await fetch(`${RADIKO_BASE}/v2/api/auth2`, {
					headers: {
						"X-Radiko-AuthToken": authToken,
						"X-Radiko-PartialKey": partialKey,
						"X-Radiko-Device": "pc",
						"X-Radiko-User": "dummy_user",
						"X-Real-IP": clientIp,
					},
				});

				if (!resAuth2.ok) {
					return new Response(
						JSON.stringify({ error: "Auth2 failed", status: resAuth2.status }),
						{ status: 502, headers: { "Content-Type": "application/json" } },
					);
				}

				const auth2Text = await resAuth2.text();
				const areaId = auth2Text.trim().split(",")[0] ?? "JP13";

				return new Response(
					JSON.stringify({ authToken, areaId }),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
							// 8分キャッシュ（Radiko トークンの有効期限に合わせる）
							"Cache-Control": "private, max-age=480",
						},
					},
				);
			},
		},
	},
});
