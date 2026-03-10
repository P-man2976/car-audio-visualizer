import { createFileRoute } from "@tanstack/react-router";

const RADIKO_BASE = "https://radiko.jp";

export const Route = createFileRoute("/api/radiko/$")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const splat = params._splat ?? "";

				// /area はクライアントから直接取得するため、プロキシしない
				if (splat === "area") {
					return new Response("Not proxied", { status: 404 });
				}

				// 許可するパスプレフィックス（Radiko の公開 API のみ通す）
				const ALLOWED_PREFIXES = ["v3/station/", "v3/program/", "v2/station/"];
				if (!ALLOWED_PREFIXES.some((prefix) => splat.startsWith(prefix))) {
					return new Response("Forbidden path", { status: 403 });
				}

				const upstreamUrl = new URL(`${RADIKO_BASE}/${splat}`);

				// Forward query params
				const originalUrl = new URL(request.url);
				for (const [key, value] of originalUrl.searchParams) {
					upstreamUrl.searchParams.set(key, value);
				}

				// Forward headers, exclude hop-by-hop / origin headers
				const forwardHeaders = new Headers();
				for (const [key, value] of request.headers) {
					if (
						![
							"host",
							"origin",
							"referer",
							"x-forwarded-host",
							"x-forwarded-for",
							"cf-ray",
							"cf-connecting-ip",
							"cf-ipcountry",
							"cf-visitor",
						].includes(key.toLowerCase())
					) {
						forwardHeaders.set(key, value);
					}
				}

				const response = await fetch(upstreamUrl.toString(), {
					headers: forwardHeaders,
				});

				const resHeaders = new Headers(response.headers);
				resHeaders.set("Access-Control-Allow-Origin", "*");

				return new Response(response.body, {
					status: response.status,
					headers: resHeaders,
				});
			},
		},
	},
});
