import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse, performRadikoAuth } from "@/lib/radiko-auth";

export const Route = createFileRoute("/api/radiko/auth")({
  server: {
    handlers: {
      // auth1 + auth2 を同一 Worker インスタンス上で完結させる。
      // Radiko はトークンを auth1 の送信元 IP に紐付けるため、
      // auth1/auth2 を別リクエストでプロキシすると異なるエッジノードに
      // 振り分けられて 400 になることがある。
      GET: async ({ request }) => {
        // Cloudflare Workers の request.cf からクライアントの地域を取得
        // モバイル認証 (GPS) でこのエリアのトークンを取得する
        type CfProps = { country?: string; regionCode?: string };
        const cf = (request as Request & { cf?: CfProps }).cf;
        const targetArea =
          cf?.country === "JP" && cf?.regionCode ? `JP${Number(cf.regionCode)}` : undefined;

        try {
          const { authToken, areaId } = await performRadikoAuth(targetArea);
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
