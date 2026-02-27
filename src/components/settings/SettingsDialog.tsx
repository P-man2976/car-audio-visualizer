import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAtom } from "jotai";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import { type RepeatMode, repeatModeAtom, shuffleAtom } from "../../atoms/player";
import {
	type HotkeyAction,
	HOTKEY_ACTION_LABELS,
	type HotkeyBindings,
	DEFAULT_HOTKEY_BINDINGS,
	displayKey,
	hotkeyBindingsAtom,
	normalizeKey,
} from "../../atoms/hotkeys";

export function SettingsDialog({ children }: { children: ReactNode }) {
	const [shuffle, setShuffle] = useAtom(shuffleAtom);
	const [repeat, setRepeat] = useAtom(repeatModeAtom);
	const [bindings, setBindings] = useAtom(hotkeyBindingsAtom);
	const [capturing, setCapturing] = useState<HotkeyAction | null>(null);

	const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, action: HotkeyAction) => {
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

	const ACTIONS = Object.keys(HOTKEY_ACTION_LABELS) as HotkeyAction[];

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>設定</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-5 pt-2">
					{/* シャッフル */}
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">シャッフル</span>
						<Switch checked={shuffle} onCheckedChange={setShuffle} />
					</div>

					<Separator />

					{/* リピート */}
					<div className="flex flex-col gap-3">
						<span className="text-sm font-medium">リピート</span>
						<Tabs
							value={repeat}
							onValueChange={(v) => setRepeat(v as RepeatMode)}
						>
							<TabsList className="w-full">
								<TabsTrigger value="off" className="flex-1">
									オフ
								</TabsTrigger>
								<TabsTrigger value="one" className="flex-1">
									1曲
								</TabsTrigger>
								<TabsTrigger value="all" className="flex-1">
									全曲
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					<Separator />

					{/* キーボードショートカット */}
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">キーボードショートカット</span>
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
						<div className="flex flex-col gap-2">
							{ACTIONS.map((action) => (
								<div key={action} className="flex items-center justify-between">
									<span className="text-sm text-neutral-300">
										{HOTKEY_ACTION_LABELS[action]}
									</span>
									<button
										type="button"
										className={`
											min-w-20 rounded px-2 py-1 text-center text-xs font-mono transition-colors border
											${capturing === action
												? "border-blue-400 bg-blue-500/20 text-blue-300 animate-pulse"
												: "border-neutral-600 bg-neutral-800 text-neutral-200 hover:border-neutral-400"
											}
										`}
										onClick={() => setCapturing(action)}
										onKeyDown={capturing === action ? (e) => handleKeyDown(e, action) : undefined}
										onBlur={() => capturing === action && setCapturing(null)}
									>
										{capturing === action
											? "キーを押して…"
											: displayKey(bindings[action])}
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

