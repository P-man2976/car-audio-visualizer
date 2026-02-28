import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type HotkeyAction =
	| "playPause"
	| "stop"
	| "prevOrTuneDown"
	| "nextOrTuneUp"
	| "volumeUp"
	| "volumeDown"
	| "mute"
	| "seekBack"
	| "seekForward"
	| "togglePiP"
	| "toggleFullscreen"
	| "modeFile"
	| "modeRadio"
	| "modeScreen"
	| "modeAux"
	| "openSettings";

export interface HotkeyBindings {
	playPause: string;
	stop: string;
	prevOrTuneDown: string;
	nextOrTuneUp: string;
	volumeUp: string;
	volumeDown: string;
	mute: string;
	seekBack: string;
	seekForward: string;
	togglePiP: string;
	toggleFullscreen: string;
	modeFile: string;
	modeRadio: string;
	modeScreen: string;
	modeAux: string;
	openSettings: string;
}

export const DEFAULT_HOTKEY_BINDINGS: HotkeyBindings = {
	playPause: "space",
	stop: "s",
	prevOrTuneDown: "arrowleft",
	nextOrTuneUp: "arrowright",
	volumeUp: "arrowup",
	volumeDown: "arrowdown",
	mute: "m",
	seekBack: "j",
	seekForward: "l",
	togglePiP: "i",
	toggleFullscreen: "f",
	modeFile: "e",
	modeRadio: "r",
	modeScreen: "t",
	modeAux: "y",
	openSettings: "/",
};

export const HOTKEY_ACTION_LABELS: Record<HotkeyAction, string> = {
	playPause: "再生 / 一時停止",
	stop: "停止",
	prevOrTuneDown: "前のトラック / 周波数↓",
	nextOrTuneUp: "次のトラック / 周波数↑",
	volumeUp: "音量アップ",
	volumeDown: "音量ダウン",
	mute: "ミュート切り替え",
	seekBack: "10秒戻し",
	seekForward: "10秒送り",
	togglePiP: "PiP 切り替え",
	toggleFullscreen: "フルスクリーン切り替え",
	modeFile: "ファイルモード",
	modeRadio: "ラジオモード",
	modeScreen: "画面共有モード",
	modeAux: "外部入力モード",
	openSettings: "設定を開く",
};

/** グループ分けして設定UIで表示するためのセクション定義 */
export const HOTKEY_ACTION_SECTIONS: {
	label: string;
	actions: HotkeyAction[];
}[] = [
	{
		label: "再生操作",
		actions: [
			"playPause",
			"stop",
			"seekBack",
			"seekForward",
			"prevOrTuneDown",
			"nextOrTuneUp",
		],
	},
	{
		label: "音量",
		actions: ["volumeUp", "volumeDown", "mute"],
	},
	{
		label: "画面",
		actions: ["togglePiP", "toggleFullscreen"],
	},
	{
		label: "モード切り替え",
		actions: ["modeFile", "modeRadio", "modeScreen", "modeAux"],
	},
	{
		label: "その他",
		actions: ["openSettings"],
	},
];

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

// v2: 新アクション追加によりストレージキーをバンプ（旧設定は破棄してデフォルトを使用）
export const hotkeyBindingsAtom = atomWithStorage<HotkeyBindings>(
	"cav-hotkey-bindings-v2",
	DEFAULT_HOTKEY_BINDINGS,
);

/** 設定ダイアログの開閉状態。/キーと設定ボタンから制御する */
export const settingsOpenAtom = atom(false);
