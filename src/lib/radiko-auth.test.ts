/**
 * radiko-auth.ts — jsonResponse / errorResponse / performRadikoAuth のテスト
 */
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
	AUTH_CACHE_TTL,
	errorResponse,
	jsonResponse,
	performRadikoAuth,
	RADIKO_BASE,
} from "@/lib/radiko-auth";

describe("jsonResponse", () => {
	test("JSON Content-Type と CORS ヘッダー付きのレスポンスを返す", async () => {
		const res = jsonResponse({ ok: true });
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toBe("application/json");
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
		const body = await res.json();
		expect(body).toEqual({ ok: true });
	});

	test("カスタムステータスコードを設定できる", async () => {
		const res = jsonResponse({ data: 42 }, 201);
		expect(res.status).toBe(201);
	});

	test("追加ヘッダーを設定できる", async () => {
		const res = jsonResponse({ data: "x" }, 200, { "X-Custom": "value" });
		expect(res.headers.get("X-Custom")).toBe("value");
	});
});

describe("errorResponse", () => {
	test("エラーメッセージとステータスを含むレスポンスを返す", async () => {
		const res = errorResponse("Not found", 404);
		expect(res.status).toBe(404);
		expect(res.headers.get("Content-Type")).toBe("application/json");
		const body = await res.json();
		expect(body).toEqual({ error: "Not found" });
	});

	test("追加フィールドをマージできる", async () => {
		const res = errorResponse("Failed", 502, { status: 500 });
		const body = await res.json();
		expect(body).toEqual({ error: "Failed", status: 500 });
	});
});

describe("定数", () => {
	test("RADIKO_BASE が https://radiko.jp", () => {
		expect(RADIKO_BASE).toBe("https://radiko.jp");
	});

	test("AUTH_CACHE_TTL が 8 分 (480000ms)", () => {
		expect(AUTH_CACHE_TTL).toBe(1000 * 60 * 8);
	});
});

describe("performRadikoAuth", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("auth1 → auth2 成功時に authToken を返す", async () => {
		// auth1 レスポンス
		const auth1Headers = new Headers({
			"x-radiko-authtoken": "test-auth-token",
			"x-radiko-keylength": "16",
			"x-radiko-keyoffset": "0",
		});
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				headers: auth1Headers,
			} as Response)
			// auth2 レスポンス
			.mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve("JP13,東京都,..."),
			} as Response);

		const result = await performRadikoAuth();
		expect(result.authToken).toBe("test-auth-token");
		expect(fetch).toHaveBeenCalledTimes(2);

		// auth1 URL の検証
		const auth1Url = vi.mocked(fetch).mock.calls[0][0];
		expect(auth1Url).toBe(`${RADIKO_BASE}/v2/api/auth1`);

		// auth2 URL の検証
		const auth2Url = vi.mocked(fetch).mock.calls[1][0];
		expect(auth2Url).toBe(`${RADIKO_BASE}/v2/api/auth2`);
	});

	test("auth1 失敗時に Response を throw する", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 500,
		} as Response);

		try {
			await performRadikoAuth();
			expect.fail("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(Response);
			const body = await (e as Response).json();
			expect(body.error).toBe("Auth1 failed");
		}
	});

	test("auth1 で authToken がない場合に Response を throw する", async () => {
		const emptyHeaders = new Headers({});
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			headers: emptyHeaders,
		} as Response);

		try {
			await performRadikoAuth();
			expect.fail("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(Response);
			const body = await (e as Response).json();
			expect(body.error).toBe("No X-Radiko-AuthToken in auth1 response");
		}
	});

	test("auth2 失敗時に Response を throw する", async () => {
		const auth1Headers = new Headers({
			"x-radiko-authtoken": "test-token",
			"x-radiko-keylength": "16",
			"x-radiko-keyoffset": "0",
		});
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				headers: auth1Headers,
			} as Response)
			.mockResolvedValueOnce({
				ok: false,
				status: 403,
			} as Response);

		try {
			await performRadikoAuth();
			expect.fail("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(Response);
			const body = await (e as Response).json();
			expect(body.error).toBe("Auth2 failed");
		}
	});
});
