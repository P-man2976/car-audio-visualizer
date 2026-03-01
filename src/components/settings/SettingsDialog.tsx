import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAtom } from "jotai";
import { LogOut } from "lucide-react";
import { type KeyboardEvent, useCallback, useState } from "react";
import { lastfmSessionAtom } from "@/atoms/lastfm";
import {
	type HotkeyAction,
	HOTKEY_ACTION_LABELS,
	HOTKEY_ACTION_SECTIONS,
	type HotkeyBindings,
	DEFAULT_HOTKEY_BINDINGS,
	displayKey,
	hotkeyBindingsAtom,
	normalizeKey,
	settingsOpenAtom,
} from "@/atoms/hotkeys";
import { visualizerStyleAtom, type VisualizerStyle } from "@/atoms/visualizer";

export function SettingsDialog() {
	const [open, setOpen] = useAtom(settingsOpenAtom);
	const [bindings, setBindings] = useAtom(hotkeyBindingsAtom);
	const [capturing, setCapturing] = useState<HotkeyAction | null>(null);
	const [lastfmSession, setLastfmSession] = useAtom(lastfmSessionAtom);
	const [lastfmConnecting, setLastfmConnecting] = useState(false);
	const [visualizerStyle, setVisualizerStyle] = useAtom(visualizerStyleAtom);

	// Last.fm OAuth: ポップアップ or 同一タブリダイレクトで認証する
	const connectLastfm = useCallback(() => {
		const callbackUrl = `${window.location.origin}/lastfm-callback`;
		const authUrl = `https://www.last.fm/api/auth/?${new URLSearchParams({
			api_key: import.meta.env.VITE_LASTFM_APIKEY,
			cb: callbackUrl,
		})}`;

		// ポップアップを試みる（ブロックされた場合は null）
		const popup = window.open(authUrl, "lastfm-auth", "width=600,height=700");
		if (!popup) {
			// ポップアップがブロックされた → 同一タブでリダイレクト
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

		// popup が閉じられたら後片付け
		pollClosed = setInterval(() => {
			if (popup.closed) {
				clearInterval(pollClosed);
				window.removeEventListener("message", handler);
				setLastfmConnecting(false);
			}
		}, 500);
	}, [setLastfmSession]);

	const handleKeyDown = (
		e: KeyboardEvent<HTMLButtonElement>,
		action: HotkeyAction,
	) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.key === "Escape") {
			setCapturing(null);
			return;
		}
		const key = normalizeKey(e.key);
		setBindings((prev: HotkeyBindings) => ({ ...prev, [action]: key }));
		setCapturing(null);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				setOpen(v);
				if (!v) setCapturing(null);
			}}
		>
			<DialogContent className="max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
				<DialogHeader className="shrink-0">
					<DialogTitle>設定</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-5 pt-2 overflow-y-auto pr-1">
					{/* ビジュアライザースタイル */}
					<div className="flex flex-col gap-3">
						<span className="text-sm font-medium">ビジュアライザー</span>
						<div className="flex gap-2">
							{([
								{ value: "standard", label: "スタンダード" },
								{ value: "dpx5021m", label: "DPX-5021M" },
							] as { value: VisualizerStyle; label: string }[]).map(({ value, label }) => (
								<button
									key={value}
									type="button"
									className={`flex-1 rounded px-3 py-1.5 text-sm border transition-colors ${
										visualizerStyle === value
											? "border-neutral-400 bg-neutral-500/40 text-neutral-100"
											: "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300"
									}`}
									onClick={() => setVisualizerStyle(value)}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<Separator />

					{/* Last.fm 連携 */}
					<div className="flex flex-col gap-3">
						<span className="text-sm font-medium">Last.fm</span>
						{lastfmSession ? (
							<Button
								variant="outline"
								className="border-[#D51007] hover:bg-[#D5100730] gap-2 text-sm"
								onClick={() => setLastfmSession(null)}
							>
								<LogOut className="size-4" />
								{lastfmSession.name} で連携中
							</Button>
						) : (
							<Button
								className="bg-[#D51007aa] hover:bg-[#D51007dd] text-sm"
								onClick={connectLastfm}
								disabled={lastfmConnecting}
							>
								{lastfmConnecting ? "認証中…" : "Last.fm と連携する"}
							</Button>
						)}
					</div>

					<Separator />

					{/* キーボードショートカット */}
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">
								キーボードショートカット
							</span>
							<button
								type="button"
								className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
								onClick={() => {
									setBindings(DEFAULT_HOTKEY_BINDINGS);
									setCapturing(null);
								}}
							>
								リセット
							</button>
						</div>

						{HOTKEY_ACTION_SECTIONS.map((section, si) => (
							<div key={section.label} className="flex flex-col gap-1">
								{si > 0 && <div className="h-px bg-neutral-800 mb-1" />}
								<span className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
									{section.label}
								</span>
								{section.actions.map((action) => (
									<div
										key={action}
										className="flex items-center justify-between py-0.5"
									>
										<span className="text-sm text-neutral-300">
											{HOTKEY_ACTION_LABELS[action]}
										</span>
										<button
											type="button"
											className={`
												min-w-20 rounded px-2 py-1 text-center text-xs font-mono transition-colors border
												${
													capturing === action
														? "border-blue-400 bg-blue-500/20 text-blue-300 animate-pulse"
														: "border-neutral-600 bg-neutral-800 text-neutral-200 hover:border-neutral-400"
												}
											`}
											onClick={() => setCapturing(action)}
											onKeyDown={
												capturing === action
													? (e) => handleKeyDown(e, action)
													: undefined
											}
											onBlur={() => capturing === action && setCapturing(null)}
										>
											{capturing === action
												? "キーを押して…"
												: displayKey(bindings[action] ?? "")}
										</button>
									</div>
								))}
							</div>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
