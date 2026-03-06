/**
 * lastfm.ts — deriveLastfmSignature 純粋関数テスト
 *
 * SECRET は import.meta.env.VITE_LASTFM_SECRET で読まれるため、
 * vitest の env 設定でモック値を注入する。
 */
import { describe, expect, test, vi } from "vitest";

// import.meta.env のモック
vi.stubEnv("VITE_LASTFM_APIKEY", "test-api-key");
vi.stubEnv("VITE_LASTFM_SECRET", "test-secret");

// stubEnv の後にインポート
const { deriveLastfmSignature } = await import("@/lib/lastfm");

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
