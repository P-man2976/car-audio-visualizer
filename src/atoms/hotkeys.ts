import { atomWithStorage } from "jotai/utils";

export type HotkeyAction = "playPause" | "stop" | "prevOrTuneDown" | "nextOrTuneUp";

export interface HotkeyBindings {
	playPause: string;
	stop: string;
	prevOrTuneDown: string;
	nextOrTuneUp: string;
}

export const DEFAULT_HOTKEY_BINDINGS: HotkeyBindings = {
	playPause: "space",
	stop: "s",
	prevOrTuneDown: "arrowleft",
	nextOrTuneUp: "arrowright",
};

export const HOTKEY_ACTION_LABELS: Record<HotkeyAction, string> = {
	playPause: "再生 / 一時停止",
	stop: "停止",
	prevOrTuneDown: "前のトラック / 周波数↓",
	nextOrTuneUp: "次のトラック / 周波数↑",
};

/** KeyboardEvent.key → react-hotkeys-hook 用キー名 */
export function normalizeKey(key: string): string {
	const map: Record<string, string> = {
		" ": "space",
		ArrowLeft: "arrowleft",
		ArrowRight: "arrowright",
		ArrowUp: "arrowup",
		ArrowDown: "arrowdown",
		Enter: "enter",
		Escape: "escape",
		Backspace: "backspace",
		Tab: "tab",
		Delete: "delete",
	};
	return map[key] ?? key.toLowerCase();
}

/** 内部キー名 → 表示文字列 */
export function displayKey(key: string): string {
	const map: Record<string, string> = {
		space: "Space",
		arrowleft: "←",
		arrowright: "→",
		arrowup: "↑",
		arrowdown: "↓",
		enter: "Enter",
		escape: "Esc",
		backspace: "Backspace",
		tab: "Tab",
		delete: "Delete",
	};
	return map[key] ?? key.toUpperCase();
}

export const hotkeyBindingsAtom = atomWithStorage<HotkeyBindings>(
	"cav-hotkey-bindings",
	DEFAULT_HOTKEY_BINDINGS,
);
