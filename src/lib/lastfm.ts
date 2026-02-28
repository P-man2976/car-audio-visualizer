import md5 from "md5";

const API_URL = "https://ws.audioscrobbler.com/2.0/";
const API_KEY = import.meta.env.VITE_LASTFM_APIKEY as string;
const SECRET = import.meta.env.VITE_LASTFM_SECRET as string;

/** Last.fm API 署名を生成する（md5(params + secret)） */
export function deriveLastfmSignature(
	params: Record<string, string | null | undefined>,
): string {
	const str =
		Object.entries(params)
			.filter((entry): entry is [string, string] => entry[1] != null)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, val]) => key + val)
			.join("") + SECRET;
	return md5(str);
}

/** auth.getToken の token を session key に交換する */
export async function getSession(token: string): Promise<LastfmSession> {
	const params: Record<string, string> = {
		api_key: API_KEY,
		method: "auth.getSession",
		token,
	};
	const api_sig = deriveLastfmSignature(params);
	const query = new URLSearchParams({ ...params, format: "json", api_sig });
	const res = await fetch(`${API_URL}?${query}`);
	if (!res.ok) throw new Error(`Last.fm auth.getSession failed: ${res.status}`);
	const data = await res.json();
	if (data.error) throw new Error(`Last.fm error ${data.error}: ${data.message}`);
	return data.session as LastfmSession;
}

export interface NowPlayingParams {
	track: string;
	artist: string;
	album?: string;
	duration?: number; // 秒
}

/** track.updateNowPlaying を送信する */
export async function updateNowPlaying(
	session: LastfmSession,
	{ track, artist, album, duration }: NowPlayingParams,
): Promise<void> {
	const params: Record<string, string | undefined> = {
		api_key: API_KEY,
		method: "track.updateNowPlaying",
		sk: session.key,
		track,
		artist,
		album,
		duration: duration != null ? String(Math.floor(duration)) : undefined,
	};
	const api_sig = deriveLastfmSignature(params);
	const body = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v != null) body.append(k, v);
	}
	body.append("api_sig", api_sig);
	body.append("format", "json");
	const res = await fetch(API_URL, { method: "POST", body });
	if (!res.ok) throw new Error(`Last.fm updateNowPlaying failed: ${res.status}`);
}

export interface ScrobbleParams {
	track: string;
	artist: string;
	album?: string;
	duration?: number; // 秒
	timestamp?: number; // Unix epoch（デフォルト: 現在時刻）
}

/** track.scrobble を送信する */
export async function scrobble(
	session: LastfmSession,
	{ track, artist, album, duration, timestamp }: ScrobbleParams,
): Promise<void> {
	const ts = String(timestamp ?? Math.floor(Date.now() / 1000));
	const params: Record<string, string | undefined> = {
		api_key: API_KEY,
		method: "track.scrobble",
		sk: session.key,
		track,
		artist,
		album,
		duration: duration != null ? String(Math.floor(duration)) : undefined,
		timestamp: ts,
	};
	const api_sig = deriveLastfmSignature(params);
	const body = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v != null) body.append(k, v);
	}
	body.append("api_sig", api_sig);
	body.append("format", "json");
	const res = await fetch(API_URL, { method: "POST", body });
	if (!res.ok) throw new Error(`Last.fm scrobble failed: ${res.status}`);
}
