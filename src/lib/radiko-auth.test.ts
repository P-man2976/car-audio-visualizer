/**
 * radiko-auth.ts — jsonResponse / errorResponse ヘルパーのテスト
 */
import { describe, expect, test } from "vitest";
import {
	AUTH_CACHE_TTL,
	errorResponse,
	jsonResponse,
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
