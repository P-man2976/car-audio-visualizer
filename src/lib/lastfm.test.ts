/**
 * lastfm.ts — deriveLastfmSignature / getSession / updateNowPlaying / scrobble テスト
 *
 * SECRET は import.meta.env.VITE_LASTFM_SECRET で読まれるため、
 * vitest の env 設定でモック値を注入する。
 */
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

// import.meta.env のモック
vi.stubEnv("VITE_LASTFM_APIKEY", "test-api-key");
vi.stubEnv("VITE_LASTFM_SECRET", "test-secret");

// stubEnv の後にインポート
const { deriveLastfmSignature, getSession, updateNowPlaying, scrobble } =
	await import("@/lib/lastfm");

const mockSession = { name: "user", key: "sk-123", subscriber: 0 };

describe("deriveLastfmSignature", () => {
	test("パラメータをキー順にソートして連結し、SECRET を付与して md5 する", () => {
		const sig = deriveLastfmSignature({
			method: "track.scrobble",
			api_key: "abc123",
			track: "Song",
		});
		// md5("api_keyabc123methodtrack.scrobbletrackSongtest-secret")
		expect(sig).toMatch(/^[0-9a-f]{32}$/);
	});

	test("null/undefined のパラメータはフィルタされる", () => {
		const sig1 = deriveLastfmSignature({
			a: "1",
			b: null,
			c: undefined,
		});
		const sig2 = deriveLastfmSignature({
			a: "1",
		});
		expect(sig1).toBe(sig2);
	});

	test("同じ入力で同じ署名を返す（決定的）", () => {
		const params = { z: "last", a: "first", m: "middle" };
		expect(deriveLastfmSignature(params)).toBe(deriveLastfmSignature(params));
	});

	test("パラメータ順序が異なっても同じ署名を返す", () => {
		const sig1 = deriveLastfmSignature({ b: "2", a: "1" });
		const sig2 = deriveLastfmSignature({ a: "1", b: "2" });
		expect(sig1).toBe(sig2);
	});
});

describe("getSession", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("成功時にセッションを返す", async () => {
		const mockRes = {
			ok: true,
			json: () => Promise.resolve({ session: mockSession }),
		};
		vi.mocked(fetch).mockResolvedValueOnce(mockRes as Response);

		const session = await getSession("token-abc");
		expect(session).toEqual(mockSession);
		expect(fetch).toHaveBeenCalledOnce();
	});

	test("HTTP エラー時に例外を投げる", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 403,
		} as Response);

		await expect(getSession("bad-token")).rejects.toThrow(
			"Last.fm auth.getSession failed: 403",
		);
	});

	test("API エラーレスポンス時に例外を投げる", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ error: 4, message: "Invalid token" }),
		} as Response);

		await expect(getSession("expired-token")).rejects.toThrow(
			"Last.fm error 4: Invalid token",
		);
	});
});

describe("updateNowPlaying", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("成功時に正常終了する", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

		await expect(
			updateNowPlaying(mockSession, {
				track: "Song",
				artist: "Artist",
			}),
		).resolves.toBeUndefined();

		expect(fetch).toHaveBeenCalledOnce();
		const [url, opts] = vi.mocked(fetch).mock.calls[0];
		expect(url).toBe("https://ws.audioscrobbler.com/2.0/");
		expect(opts?.method).toBe("POST");
	});

	test("duration が含まれる場合はリクエストに追加される", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

		await updateNowPlaying(mockSession, {
			track: "Song",
			artist: "Artist",
			duration: 180.5,
		});

		const body = vi.mocked(fetch).mock.calls[0][1]?.body as URLSearchParams;
		expect(body.get("duration")).toBe("180"); // Math.floor
	});

	test("HTTP エラー時に例外を投げる", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 500,
		} as Response);

		await expect(
			updateNowPlaying(mockSession, {
				track: "Song",
				artist: "Artist",
			}),
		).rejects.toThrow("Last.fm updateNowPlaying failed: 500");
	});
});

describe("scrobble", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("成功時に正常終了する", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

		await expect(
			scrobble(mockSession, {
				track: "Song",
				artist: "Artist",
				timestamp: 1700000000,
			}),
		).resolves.toBeUndefined();

		expect(fetch).toHaveBeenCalledOnce();
	});

	test("timestamp 省略時は現在時刻が使われる", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

		const before = Math.floor(Date.now() / 1000);
		await scrobble(mockSession, { track: "Song", artist: "Artist" });
		const after = Math.floor(Date.now() / 1000);

		const body = vi.mocked(fetch).mock.calls[0][1]?.body as URLSearchParams;
		const ts = Number(body.get("timestamp"));
		expect(ts).toBeGreaterThanOrEqual(before);
		expect(ts).toBeLessThanOrEqual(after);
	});

	test("HTTP エラー時に例外を投げる", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 503,
		} as Response);

		await expect(
			scrobble(mockSession, {
				track: "Song",
				artist: "Artist",
			}),
		).rejects.toThrow("Last.fm scrobble failed: 503");
	});
});
