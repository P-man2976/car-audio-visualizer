import { createFileRoute } from "@tanstack/react-router";

const RADIKO_BASE = "https://radiko.jp";
const AUTH_KEY = "bcd151073c03b352e1ef2fd66c32209da9ca0afa";
const PLAYLIST_BASE = "https://si-f-radiko.smartstream.ne.jp/so/playlist.m3u8";

/**
 * auth1 → auth2 → playlist.m3u8 を同一 Worker 実行内で完結させる。
 * すべての upstream fetch が同じ outbound IP から出るため、
 * Radiko の IP バインディングによる 403 を回避できる。
 */
export const Route = createFileRoute("/api/radiko/stream")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const stationId = new URL(request.url).searchParams.get("station_id");
				if (!stationId) {
					return new Response(
						JSON.stringify({ error: "Missing station_id query parameter" }),
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
						JSON.stringify({
							error: "No X-Radiko-AuthToken in auth1 response",
						}),
						{ status: 502, headers: { "Content-Type": "application/json" } },
					);
				}

				const partialKey = btoa(
					AUTH_KEY.slice(keyOffset, keyOffset + keyLength),
				);

				// --- auth2 ---
				const resAuth2 = await fetch(`${RADIKO_BASE}/v2/api/auth2`, {
					headers: {
						"X-Radiko-AuthToken": authToken,
						"X-Radiko-PartialKey": partialKey,
						"X-Radiko-Device": "pc",
						"X-Radiko-User": "dummy_user",
					},
				});

				if (!resAuth2.ok) {
					return new Response(
						JSON.stringify({ error: "Auth2 failed", status: resAuth2.status }),
						{ status: 502, headers: { "Content-Type": "application/json" } },
					);
				}
				await resAuth2.text();

				// --- playlist.m3u8 (auth と同一 outbound IP から fetch) ---
				const playlistUrl = new URL(PLAYLIST_BASE);
				playlistUrl.searchParams.set("station_id", stationId);
				playlistUrl.searchParams.set("type", "b");
				playlistUrl.searchParams.set("l", "15");
				playlistUrl.searchParams.set("lsid", "11cbd3124cef9e8004f9b5e9f77b66");

				const resPlaylist = await fetch(playlistUrl.toString(), {
					headers: { "X-Radiko-AuthToken": authToken },
				});

				if (!resPlaylist.ok) {
					return new Response(
						JSON.stringify({
							error: "Playlist fetch failed",
							status: resPlaylist.status,
						}),
						{ status: 502, headers: { "Content-Type": "application/json" } },
					);
				}

				// master playlist から最初のストリーム URI を抽出
				// 例: #EXT-X-STREAM-INF:... の次の行が URI
				const m3u8Text = await resPlaylist.text();
				const streamUri = m3u8Text
					.split("\n")
					.map((l) => l.trim())
					.find((l) => l.startsWith("http"));

				if (!streamUri) {
					return new Response(
						JSON.stringify({ error: "Stream URI not found in playlist" }),
						{ status: 502, headers: { "Content-Type": "application/json" } },
					);
				}

				return new Response(JSON.stringify({ streamUri }), {
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				});
			},
		},
	},
});
