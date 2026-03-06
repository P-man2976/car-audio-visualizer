/**
 * Radiko auth1 → auth2 の共通ヘルパー。
 * auth.ts / stream.ts の両方から利用し、認証フロー重複を排除する。
 *
 * CF Cache API を利用して同一 PoP 内で 8 分間キャッシュする (cross-isolate)。
 * 同時リクエストの重複呼び出しも pendingAuth で排除する。
 */

export const RADIKO_BASE = "https://radiko.jp";
const AUTH_KEY = "bcd151073c03b352e1ef2fd66c32209da9ca0afa";

/** 認証キャッシュの有効期間 (8 分) */
export const AUTH_CACHE_TTL = 1000 * 60 * 8;

let _pendingAuth: Promise<{ authToken: string }> | null = null;

// ---------------------------------------------------------------------------
// CF Cache API layer (cross-isolate, same PoP)
// ---------------------------------------------------------------------------

/** CF Cache に使う内部キー URL */
const CF_CACHE_KEY_URL = "https://internal.cav/radiko-auth-token";

/**
 * caches.default が利用可能かどうか。
 * Workers 環境でのみ true。ブラウザや Node (vitest) では false。
 */
function hasCFCache(): boolean {
	return (
		typeof caches !== "undefined" &&
		"default" in caches &&
		caches.default != null
	);
}

/**
 * CF Cache から authToken を取得する。キャッシュミス/非対応環境では undefined。
 */
async function getCFCachedToken(): Promise<string | undefined> {
	if (!hasCFCache()) return undefined;
	try {
		const cache = (caches as unknown as { default: Cache }).default;
		const res = await cache.match(new Request(CF_CACHE_KEY_URL));
		if (!res) return undefined;
		const { authToken } = (await res.json()) as { authToken: string };
		return authToken;
	} catch {
		return undefined;
	}
}

/**
 * CF Cache に authToken を保存する (max-age = AUTH_CACHE_TTL 秒)。
 */
async function setCFCachedToken(authToken: string): Promise<void> {
	if (!hasCFCache()) return;
	try {
		const cache = (caches as unknown as { default: Cache }).default;
		const res = new Response(JSON.stringify({ authToken }), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": `public, max-age=${AUTH_CACHE_TTL / 1000}`,
			},
		});
		await cache.put(new Request(CF_CACHE_KEY_URL), res);
	} catch {
		// キャッシュ書き込み失敗は無視
	}
}

// ---------------------------------------------------------------------------
// performRadikoAuth (CF Cache → upstream)
// ---------------------------------------------------------------------------

/**
 * auth1 → auth2 を実行し authToken を返す。
 *
 * キャッシュ確認順:
 *   1. CF Cache API (同一 PoP, cross-isolate, ~1ms)
 *   2. upstream auth1/auth2 fetch
 *
 * 同時呼び出しは 1 つの実行に集約される (dedup)。
 * 失敗時は Response を throw する（呼び出し側で catch して返す）。
 */
export async function performRadikoAuth(): Promise<{ authToken: string }> {
	// 1. CF Cache (cross-isolate)
	const cfCached = await getCFCachedToken();
	if (cfCached) return { authToken: cfCached };

	// 2. 他のリクエストが既に auth 中なら同じ Promise を返す (dedup)
	if (_pendingAuth) return _pendingAuth;

	_pendingAuth = doRadikoAuth()
		.then(async (result) => {
			_pendingAuth = null;
			await setCFCachedToken(result.authToken);
			return result;
		})
		.catch((err) => {
			_pendingAuth = null;
			throw err;
		});

	return _pendingAuth;
}

/**
 * 実際の auth1 → auth2 通信を行う内部関数。
 */
async function doRadikoAuth(): Promise<{ authToken: string }> {
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

	// auth2 のレスポンスボディは破棄
	await resAuth2.text();

	return { authToken };
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
