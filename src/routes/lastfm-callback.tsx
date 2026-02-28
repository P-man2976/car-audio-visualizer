import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getSession } from "../lib/lastfm";
import { LASTFM_SESSION_STORAGE_KEY } from "../atoms/lastfm";

function LastfmCallbackPage() {
	const navigate = useNavigate();
	const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

	useEffect(() => {
		const token = new URLSearchParams(window.location.search).get("token");
		if (!token) {
			setStatus("error");
			return;
		}

		getSession(token)
			.then((session) => {
				setStatus("ok");
				if (window.opener && !window.opener.closed) {
					// ポップアップ経由: 親ウィンドウにセッションを渡して閉じる
					window.opener.postMessage(
						{ type: "lastfm-session", session },
						window.location.origin,
					);
					window.close();
				} else {
					// 同一タブリダイレクト経由: localStorage に保存してトップへ戻る
					try {
						localStorage.setItem(
							LASTFM_SESSION_STORAGE_KEY,
							JSON.stringify(session),
						);
					} catch {
						// localStorage が使えない場合は無視
					}
					navigate({ to: "/" });
				}
			})
			.catch((err) => {
				console.error("[lastfm] getSession failed:", err);
				setStatus("error");
				if (window.opener && !window.opener.closed) {
					window.close();
				} else {
					navigate({ to: "/" });
				}
			});
	}, [navigate]);

	return (
		<div className="flex h-dvh items-center justify-center bg-neutral-950 text-neutral-200">
			<p className="text-sm">
				{status === "error" ? "Last.fm 認証に失敗しました" : "Last.fm 認証中…"}
			</p>
		</div>
	);
}

export const Route = createFileRoute("/lastfm-callback")({  
	ssr: false,
	component: LastfmCallbackPage,
});

