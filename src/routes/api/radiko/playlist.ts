import { createFileRoute } from "@tanstack/react-router";

const PLAYLIST_BASE =
	"https://si-f-radiko.smartstream.ne.jp/so/playlist.m3u8";

export const Route = createFileRoute("/api/radiko/playlist")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const originalUrl = new URL(request.url);

				// クエリパラメータをそのまま upstream に転送
				const upstreamUrl = new URL(PLAYLIST_BASE);
				for (const [key, value] of originalUrl.searchParams) {
					upstreamUrl.searchParams.set(key, value);
				}

				// X-Radiko-AuthToken だけ転送
				const authToken = request.headers.get("x-radiko-authtoken") ?? "";
				const response = await fetch(upstreamUrl.toString(), {
					headers: { "X-Radiko-AuthToken": authToken },
				});

				if (!response.ok) {
					return new Response(
						JSON.stringify({ error: "Playlist fetch failed", status: response.status }),
						{ status: 502, headers: { "Content-Type": "application/json" } },
					);
				}

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
