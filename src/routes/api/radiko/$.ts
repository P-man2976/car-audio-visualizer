import { createFileRoute } from "@tanstack/react-router";

const RADIKO_BASE = "https://radiko.jp";

export const Route = createFileRoute("/api/radiko/$")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const splat = params._splat ?? "";
				const upstreamUrl = new URL(`${RADIKO_BASE}/${splat}`);

				// Forward query params
				const originalUrl = new URL(request.url);
				for (const [key, value] of originalUrl.searchParams) {
					upstreamUrl.searchParams.set(key, value);
				}

				// Forward headers, exclude hop-by-hop / origin headers
				const forwardHeaders = new Headers();
				for (const [key, value] of request.headers) {
					if (!["host", "origin", "referer"].includes(key.toLowerCase())) {
						forwardHeaders.set(key, value);
					}
				}

				const response = await fetch(upstreamUrl.toString(), {
					headers: forwardHeaders,
				});

				const resHeaders = new Headers(response.headers);
				resHeaders.set("Access-Control-Allow-Origin", "*");

				return new Response(response.body, {
					status: response.status,
					headers: resHeaders,
				});
			},
		},
	},
});
