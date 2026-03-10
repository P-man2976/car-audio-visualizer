import { useAtom } from "jotai";
import { LogOut, Music2 } from "lucide-react";
import { useCallback, useState } from "react";
import { lastfmSessionAtom } from "@/atoms/lastfm";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function LastfmPane() {
	const [lastfmSession, setLastfmSession] = useAtom(lastfmSessionAtom);
	const [lastfmConnecting, setLastfmConnecting] = useState(false);

	const connectLastfm = useCallback(() => {
		const callbackUrl = `${window.location.origin}/lastfm-callback`;
		const authUrl = `https://www.last.fm/api/auth/?${new URLSearchParams({
			api_key: import.meta.env.VITE_LASTFM_APIKEY,
			cb: callbackUrl,
		})}`;

		const popup = window.open(authUrl, "lastfm-auth", "width=600,height=700");
		if (!popup) {
			window.location.href = authUrl;
			return;
		}
		setLastfmConnecting(true);

		let pollClosed: ReturnType<typeof setInterval>;
		const handler = (e: MessageEvent) => {
			if (e.origin !== window.location.origin) return;
			if (!e.data || e.data.type !== "lastfm-session" || !e.data.session)
				return;
			window.removeEventListener("message", handler);
			clearInterval(pollClosed);
			setLastfmSession(e.data.session as LastfmSession);
			setLastfmConnecting(false);
		};
		window.addEventListener("message", handler);

		pollClosed = setInterval(() => {
			if (popup.closed) {
				clearInterval(pollClosed);
				window.removeEventListener("message", handler);
				setLastfmConnecting(false);
			}
		}, 500);
	}, [setLastfmSession]);

	return (
		<div className="flex flex-col gap-5">
			<p className="text-xs text-neutral-400 leading-relaxed">
				Last.fm と連携すると、再生中のトラック情報が自動的にスクロブルされます。
			</p>

			<Separator />

			<div className="flex flex-col gap-3">
				<span className="text-sm font-medium">アカウント連携</span>
				{lastfmSession ? (
					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/50 p-3">
							<div className="size-8 rounded-full bg-[#D51007]/20 flex items-center justify-center shrink-0">
								<Music2 className="size-4 text-[#D51007]" />
							</div>
							<div className="flex flex-col gap-0.5 min-w-0">
								<span className="text-sm font-medium text-neutral-100 truncate">
									{lastfmSession.name}
								</span>
								<span className="text-xs text-green-400">連携中</span>
							</div>
						</div>
						<Button
							variant="outline"
							className="border-red-900 hover:bg-red-900/20 gap-2 text-sm text-red-400 hover:text-red-300"
							onClick={() => setLastfmSession(null)}
						>
							<LogOut className="size-4" />
							連携を解除する
						</Button>
					</div>
				) : (
					<div className="flex flex-col gap-3">
						<div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3 text-xs text-neutral-400 leading-relaxed">
							Last.fm アカウントを持っていない場合は{" "}
							<a
								href="https://www.last.fm/join"
								target="_blank"
								rel="noreferrer"
								className="text-neutral-300 underline hover:text-neutral-100"
							>
								last.fm/join
							</a>{" "}
							から登録できます。
						</div>
						<Button
							className="bg-[#D51007aa] hover:bg-[#D51007dd] text-sm"
							onClick={connectLastfm}
							disabled={lastfmConnecting}
						>
							{lastfmConnecting ? "認証中…" : "Last.fm と連携する"}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
