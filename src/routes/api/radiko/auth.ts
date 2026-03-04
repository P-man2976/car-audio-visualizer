import { createFileRoute } from "@tanstack/react-router";
import {
	errorResponse,
	jsonResponse,
	performRadikoAuth,
} from "@/lib/radiko-auth";

export const Route = createFileRoute("/api/radiko/auth")({
	server: {
		handlers: {
			// auth1 + auth2 を同一 Worker インスタンス上で完結させる。
			// Radiko はトークンを auth1 の送信元 IP に紐付けるため、
			// auth1/auth2 を別リクエストでプロキシすると異なるエッジノードに
			// 振り分けられて 400 になることがある。
			GET: async ({ request }) => {
				// Cloudflare Workers の request.cf からクライアントの地域を取得
				// auth2 の戻り値はエッジ(Worker)の地域になるため使わない
				type CfProps = { country?: string; regionCode?: string };
				const cf = (request as Request & { cf?: CfProps }).cf;
				const areaId =
					cf?.country === "JP" && cf?.regionCode
						? `JP${Number(cf.regionCode)}`
						: "JP13"; // デフォルト: 東京

				try {
					const { authToken } = await performRadikoAuth();
					return jsonResponse(
						{ authToken, areaId },
						200,
						// 8分キャッシュ（Radiko トークンの有効期限に合わせる）
						{ "Cache-Control": "private, max-age=480" },
					);
				} catch (e) {
					if (e instanceof Response) return e;
					return errorResponse("Internal server error", 500);
				}
			},
		},
	},
});
