import { createFileRoute } from "@tanstack/react-router";
import {
	errorResponse,
	jsonResponse,
	performRadikoAuth,
} from "@/lib/radiko-auth";

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
					return errorResponse("Missing station_id query parameter", 400);
				}

				try {
					const { authToken } = await performRadikoAuth();

					// --- playlist.m3u8 (auth と同一 outbound IP から fetch) ---
					const playlistUrl = new URL(PLAYLIST_BASE);
					playlistUrl.searchParams.set("station_id", stationId);
					playlistUrl.searchParams.set("type", "b");
					playlistUrl.searchParams.set("l", "15");
					playlistUrl.searchParams.set(
						"lsid",
						"11cbd3124cef9e8004f9b5e9f77b66",
					);

					const resPlaylist = await fetch(playlistUrl.toString(), {
						headers: { "X-Radiko-AuthToken": authToken },
					});

					if (!resPlaylist.ok) {
						return errorResponse("Playlist fetch failed", 502, {
							status: resPlaylist.status,
						});
					}

					// master playlist から最初のストリーム URI を抽出
					const m3u8Text = await resPlaylist.text();
					const streamUri = m3u8Text
						.split("\n")
						.map((l) => l.trim())
						.find((l) => l.startsWith("http"));

					if (!streamUri) {
						return errorResponse("Stream URI not found in playlist", 502);
					}

					return jsonResponse({ streamUri });
				} catch (e) {
					if (e instanceof Response) return e;
					return errorResponse("Internal server error", 500);
				}
			},
		},
	},
});
