/**
 * Radiko auth1 → auth2 の共通ヘルパー。
 * auth.ts / stream.ts の両方から利用し、認証フロー重複を排除する。
 *
 * CF Cache API を利用して同一 PoP 内で 8 分間キャッシュする (cross-isolate)。
 * 同時リクエストの重複呼び出しも pendingAuth で排除する。
 *
 * targetArea を指定するとモバイル認証 (aSmartPhone7a + GPS) を使い
 * 任意エリアのトークンを取得できる。省略時は Web 認証 (pc_html5)。
 */

import {
  computeMobilePartialKey,
  generateMobileDeviceHeaders,
  getAreaCoords,
} from "@/lib/radiko-mobile-auth";

export const RADIKO_BASE = "https://radiko.jp";
const AUTH_KEY = "bcd151073c03b352e1ef2fd66c32209da9ca0afa";

/** 認証キャッシュの有効期間 (8 分) */
export const AUTH_CACHE_TTL = 1000 * 60 * 8;

export interface RadikoAuthResult {
  authToken: string;
  areaId: string;
}

/** エリアごとの dedup 用 Map */
const _pendingAuth = new Map<string, Promise<RadikoAuthResult>>();

// ---------------------------------------------------------------------------
// CF Cache API layer (cross-isolate, same PoP)
// ---------------------------------------------------------------------------

/** CF Cache に使う内部キー URL (エリアごと) */
function cfCacheKeyUrl(targetArea?: string): string {
  const suffix = targetArea ?? "default";
  return `https://internal.cav/radiko-auth-token/${suffix}`;
}

/**
 * caches.default が利用可能かどうか。
 * Workers 環境でのみ true。ブラウザや Node (vitest) では false。
 */
function hasCFCache(): boolean {
  return typeof caches !== "undefined" && "default" in caches && caches.default != null;
}

/**
 * CF Cache から認証結果を取得する。キャッシュミス/非対応環境では undefined。
 */
async function getCFCachedAuth(targetArea?: string): Promise<RadikoAuthResult | undefined> {
  if (!hasCFCache()) return undefined;
  try {
    const cache = (caches as unknown as { default: Cache }).default;
    const res = await cache.match(new Request(cfCacheKeyUrl(targetArea)));
    if (!res) return undefined;
    return (await res.json()) as RadikoAuthResult;
  } catch {
    return undefined;
  }
}

/**
 * CF Cache に認証結果を保存する (max-age = AUTH_CACHE_TTL 秒)。
 */
async function setCFCachedAuth(result: RadikoAuthResult, targetArea?: string): Promise<void> {
  if (!hasCFCache()) return;
  try {
    const cache = (caches as unknown as { default: Cache }).default;
    const res = new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${AUTH_CACHE_TTL / 1000}`,
      },
    });
    await cache.put(new Request(cfCacheKeyUrl(targetArea)), res);
  } catch {
    // キャッシュ書き込み失敗は無視
  }
}

// ---------------------------------------------------------------------------
// performRadikoAuth (CF Cache → upstream)
// ---------------------------------------------------------------------------

/**
 * auth1 → auth2 を実行し authToken + areaId を返す。
 *
 * @param targetArea 取得したいエリア (例: "JP20")。
 *   指定時: モバイル認証 (aSmartPhone7a + GPS) で任意エリアのトークンを取得。
 *   省略時: Web 認証 (pc_html5) で IP ベースのエリアを使用。
 *
 * キャッシュ確認順:
 *   1. CF Cache API (同一 PoP, cross-isolate, ~1ms)
 *   2. upstream auth1/auth2 fetch
 *
 * 同時呼び出しは同一エリアで 1 つの実行に集約される (dedup)。
 * 失敗時は Response を throw する（呼び出し側で catch して返す）。
 */
export async function performRadikoAuth(targetArea?: string): Promise<RadikoAuthResult> {
  const cacheKey = targetArea ?? "__default__";

  // 1. CF Cache (cross-isolate)
  const cached = await getCFCachedAuth(targetArea);
  if (cached) return cached;

  // 2. 他のリクエストが既に auth 中なら同じ Promise を返す (dedup)
  const pending = _pendingAuth.get(cacheKey);
  if (pending) return pending;

  const promise = (targetArea ? doMobileAuth(targetArea) : doWebAuth())
    .then(async (result) => {
      _pendingAuth.delete(cacheKey);
      await setCFCachedAuth(result, targetArea);
      return result;
    })
    .catch((err: unknown) => {
      _pendingAuth.delete(cacheKey);
      throw err;
    });

  _pendingAuth.set(cacheKey, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Web 認証 (pc_html5) — IP ベースのエリア判定
// ---------------------------------------------------------------------------

async function doWebAuth(): Promise<RadikoAuthResult> {
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
    throw errorResponse("Auth1 failed", 502, { status: resAuth1.status });
  }

  const authToken = resAuth1.headers.get("x-radiko-authtoken");
  const keyLength = Number(resAuth1.headers.get("x-radiko-keylength"));
  const keyOffset = Number(resAuth1.headers.get("x-radiko-keyoffset"));

  if (!authToken) {
    throw errorResponse("No X-Radiko-AuthToken in auth1 response", 502);
  }

  const partialKey = btoa(AUTH_KEY.slice(keyOffset, keyOffset + keyLength));

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
    throw errorResponse("Auth2 failed", 502, { status: resAuth2.status });
  }

  const auth2Body = await resAuth2.text();
  const areaId = auth2Body.split(",")[0]?.trim() || "JP13";

  return { authToken, areaId };
}

// ---------------------------------------------------------------------------
// モバイル認証 (aSmartPhone7a) — GPS 座標で任意エリア指定
// ---------------------------------------------------------------------------

async function doMobileAuth(targetArea: string): Promise<RadikoAuthResult> {
  const deviceHeaders = generateMobileDeviceHeaders();

  // --- auth1 ---
  const resAuth1 = await fetch(`${RADIKO_BASE}/v2/api/auth1`, {
    headers: deviceHeaders,
  });

  if (!resAuth1.ok) {
    throw errorResponse("Auth1 failed (mobile)", 502, { status: resAuth1.status });
  }

  const authToken = resAuth1.headers.get("x-radiko-authtoken");
  const keyLength = Number(resAuth1.headers.get("x-radiko-keylength"));
  const keyOffset = Number(resAuth1.headers.get("x-radiko-keyoffset"));

  if (!authToken) {
    throw errorResponse("No X-Radiko-AuthToken in auth1 response (mobile)", 502);
  }

  const partialKey = computeMobilePartialKey(keyOffset, keyLength);
  const location = getAreaCoords(targetArea);

  // --- auth2 (GPS 座標付き) ---
  const resAuth2 = await fetch(`${RADIKO_BASE}/v2/api/auth2`, {
    headers: {
      ...deviceHeaders,
      "X-Radiko-AuthToken": authToken,
      "X-Radiko-PartialKey": partialKey,
      "X-Radiko-Location": location,
      "X-Radiko-Connection": "wifi",
    },
  });

  if (!resAuth2.ok) {
    throw errorResponse("Auth2 failed (mobile)", 502, { status: resAuth2.status });
  }

  const auth2Body = await resAuth2.text();
  const areaId = auth2Body.split(",")[0]?.trim() || targetArea;

  return { authToken, areaId };
}

/** JSON レスポンスを生成するヘルパー */
export function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
  });
}

/** エラーレスポンスを生成するヘルパー */
export function errorResponse(
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
