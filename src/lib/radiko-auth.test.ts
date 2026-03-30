/**
 * radiko-auth.ts — jsonResponse / errorResponse / performRadikoAuth のテスト
 */
import { describe, expect, test, vi, beforeEach, afterEach } from "vite-plus/test";
import {
  AUTH_CACHE_TTL,
  errorResponse,
  jsonResponse,
  performRadikoAuth,
  RADIKO_BASE,
} from "@/lib/radiko-auth";

// モバイル認証で使うモジュールをモック
vi.mock("@/lib/radiko-mobile-auth", () => ({
  computeMobilePartialKey: vi.fn(() => "bW9ja1BhcnRpYWxLZXk="),
  generateMobileDeviceHeaders: vi.fn(() => ({
    "X-Radiko-App": "aSmartPhone7a",
    "X-Radiko-App-Version": "7.5.0",
    "X-Radiko-Device": "29.SM-G960F",
    "X-Radiko-User": "deadbeef",
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 10.0.0;SM-G960F/NRD90M)",
  })),
  getAreaCoords: vi.fn(() => "36.651299,138.180956,gps"),
}));

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

  test("Web 認証: auth1 → auth2 成功時に authToken と areaId を返す", async () => {
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
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("JP13,東京都,tokyo Japan"),
      } as Response);

    const result = await performRadikoAuth();
    expect(result.authToken).toBe("test-auth-token");
    expect(result.areaId).toBe("JP13");
    expect(fetch).toHaveBeenCalledTimes(2);

    const auth1Url = vi.mocked(fetch).mock.calls[0][0];
    expect(auth1Url).toBe(`${RADIKO_BASE}/v2/api/auth1`);

    const auth2Url = vi.mocked(fetch).mock.calls[1][0];
    expect(auth2Url).toBe(`${RADIKO_BASE}/v2/api/auth2`);
  });

  test("モバイル認証: targetArea 指定時に aSmartPhone7a + GPS で認証する", async () => {
    const auth1Headers = new Headers({
      "x-radiko-authtoken": "mobile-token-123",
      "x-radiko-keylength": "16",
      "x-radiko-keyoffset": "100",
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        headers: auth1Headers,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve("JP20,長野県,nagano Japan"),
      } as Response);

    const result = await performRadikoAuth("JP20");
    expect(result.authToken).toBe("mobile-token-123");
    expect(result.areaId).toBe("JP20");

    const auth1Init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const auth1Headers2 = auth1Init.headers as Record<string, string>;
    expect(auth1Headers2["X-Radiko-App"]).toBe("aSmartPhone7a");

    const auth2Init = vi.mocked(fetch).mock.calls[1][1] as RequestInit;
    const auth2Headers = auth2Init.headers as Record<string, string>;
    expect(auth2Headers["X-Radiko-Location"]).toBe("36.651299,138.180956,gps");
    expect(auth2Headers["X-Radiko-Connection"]).toBe("wifi");
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
