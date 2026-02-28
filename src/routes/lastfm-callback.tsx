import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

function LastfmCallbackPage() {
	useEffect(() => {
		const token = new URLSearchParams(window.location.search).get("token");
		if (token && window.opener) {
			window.opener.postMessage(
				{ type: "lastfm-token", token },
				window.location.origin,
			);
		}
		window.close();
	}, []);

	return (
		<div className="flex h-dvh items-center justify-center bg-neutral-950 text-neutral-200">
			<p className="text-sm">Last.fm 認証中…</p>
		</div>
	);
}

export const Route = createFileRoute("/lastfm-callback")({
	ssr: false,
	component: LastfmCallbackPage,
});
