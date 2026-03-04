/**
 * Radiko auth1 → auth2 の共通フロー。
 * auth.ts / stream.ts の重複コードを統合する。
 */

export const RADIKO_BASE = "https://radiko.jp";
const AUTH_KEY = "bcd151073c03b352e1ef2fd66c32209da9ca0afa";

export interface RadikoAuthResult {
	authToken: string;
}

/**
 * auth1 + auth2 を実行し、認証トークンを返す。
 * エラー時は Response を throw する。
 */
export async function performRadikoAuth(): Promise<RadikoAuthResult> {
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
		throw new Response(
			JSON.stringify({ error: "Auth1 failed", status: resAuth1.status }),
			{ status: 502, headers: { "Content-Type": "application/json" } },
		);
	}

	const authToken = resAuth1.headers.get("x-radiko-authtoken");
	const keyLength = Number(resAuth1.headers.get("x-radiko-keylength"));
	const keyOffset = Number(resAuth1.headers.get("x-radiko-keyoffset"));

	if (!authToken) {
		throw new Response(
			JSON.stringify({
				error: "No X-Radiko-AuthToken in auth1 response",
			}),
			{ status: 502, headers: { "Content-Type": "application/json" } },
		);
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
		throw new Response(
			JSON.stringify({ error: "Auth2 failed", status: resAuth2.status }),
			{ status: 502, headers: { "Content-Type": "application/json" } },
		);
	}

	await resAuth2.text();

	return { authToken };
}

/** JSON レスポンスのショートハンド */
export function jsonResponse(
	body: Record<string, unknown>,
	status = 200,
	extra?: Record<string, string>,
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			...extra,
		},
	});
}

/** エラーレスポンスのショートハンド */
export function errorResponse(
	error: string,
	status = 502,
	extra?: Record<string, unknown>,
): Response {
	return jsonResponse({ error, ...extra }, status);
}
