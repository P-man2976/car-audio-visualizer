import { useAtom } from "jotai";
import { RotateCcw } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import {
	DEFAULT_HOTKEY_BINDINGS,
	displayKey,
	HOTKEY_ACTION_LABELS,
	HOTKEY_ACTION_SECTIONS,
	type HotkeyAction,
	type HotkeyBindings,
	hotkeyBindingsAtom,
	normalizeKey,
} from "@/atoms/hotkeys";

export function HotkeysPane() {
	const [bindings, setBindings] = useAtom(hotkeyBindingsAtom);
	const [capturing, setCapturing] = useState<HotkeyAction | null>(null);

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
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p className="text-xs text-neutral-400 leading-relaxed">
					キーをクリックして新しいショートカットを割り当てます。Esc
					でキャンセル。
				</p>
				<button
					type="button"
					className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors shrink-0 ml-2"
					onClick={() => {
						setBindings(DEFAULT_HOTKEY_BINDINGS);
						setCapturing(null);
					}}
				>
					<RotateCcw className="size-3" />
					リセット
				</button>
			</div>

			{HOTKEY_ACTION_SECTIONS.map((section, si) => (
				<div key={section.label} className="flex flex-col gap-1">
					{si > 0 && <div className="h-px bg-neutral-800 my-1" />}
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
											: "border-neutral-600 bg-neutral-800/50 text-neutral-200 hover:border-neutral-400"
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
	);
}
