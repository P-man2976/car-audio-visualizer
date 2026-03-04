/**
 * Radiko auth1 → auth2 の共通ヘルパー。
 * auth.ts / stream.ts の両方から利用し、認証フロー重複を排除する。
 */

export const RADIKO_BASE = "https://radiko.jp";
const AUTH_KEY = "bcd151073c03b352e1ef2fd66c32209da9ca0afa";

/**
 * auth1 → auth2 を実行し authToken を返す。
 * 失敗時は Response を throw する（呼び出し側で catch して返す）。
 */
export async function performRadikoAuth(): Promise<{ authToken: string }> {
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
