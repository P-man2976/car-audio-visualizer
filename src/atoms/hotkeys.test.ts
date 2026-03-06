/**
 * hotkeys atom — normalizeKey / displayKey の純粋関数テスト
 */
import { describe, expect, test } from "vitest";
import {
	DEFAULT_HOTKEY_BINDINGS,
	displayKey,
	HOTKEY_ACTION_LABELS,
	HOTKEY_ACTION_SECTIONS,
	normalizeKey,
} from "@/atoms/hotkeys";
import type { HotkeyAction } from "@/atoms/hotkeys";

describe("normalizeKey", () => {
	test("スペースキーを space に変換する", () => {
		expect(normalizeKey(" ")).toBe("space");
	});

	test("矢印キーを小文字名に変換する", () => {
		expect(normalizeKey("ArrowLeft")).toBe("arrowleft");
		expect(normalizeKey("ArrowRight")).toBe("arrowright");
		expect(normalizeKey("ArrowUp")).toBe("arrowup");
		expect(normalizeKey("ArrowDown")).toBe("arrowdown");
	});

	test("特殊キーを正規化する", () => {
		expect(normalizeKey("Enter")).toBe("enter");
		expect(normalizeKey("Escape")).toBe("escape");
		expect(normalizeKey("Backspace")).toBe("backspace");
		expect(normalizeKey("Tab")).toBe("tab");
		expect(normalizeKey("Delete")).toBe("delete");
	});

	test("英字キーを小文字に変換する", () => {
		expect(normalizeKey("A")).toBe("a");
		expect(normalizeKey("Z")).toBe("z");
		expect(normalizeKey("m")).toBe("m");
	});

	test("記号はそのまま小文字化", () => {
		expect(normalizeKey("/")).toBe("/");
		expect(normalizeKey("s")).toBe("s");
	});
});

describe("displayKey", () => {
	test("space を Space に変換する", () => {
		expect(displayKey("space")).toBe("Space");
	});

	test("矢印キーを Unicode 矢印に変換する", () => {
		expect(displayKey("arrowleft")).toBe("←");
		expect(displayKey("arrowright")).toBe("→");
		expect(displayKey("arrowup")).toBe("↑");
		expect(displayKey("arrowdown")).toBe("↓");
	});

	test("特殊キーを表示名に変換する", () => {
		expect(displayKey("enter")).toBe("Enter");
		expect(displayKey("escape")).toBe("Esc");
		expect(displayKey("backspace")).toBe("Backspace");
		expect(displayKey("tab")).toBe("Tab");
		expect(displayKey("delete")).toBe("Delete");
	});

	test("未登録キーは大文字化される", () => {
		expect(displayKey("s")).toBe("S");
		expect(displayKey("m")).toBe("M");
		expect(displayKey("f")).toBe("F");
	});
});

describe("DEFAULT_HOTKEY_BINDINGS", () => {
	test("全 HotkeyAction に対してバインディングが定義されている", () => {
		const actions: HotkeyAction[] = [
			"playPause",
			"stop",
			"prevOrTuneDown",
			"nextOrTuneUp",
			"volumeUp",
			"volumeDown",
			"mute",
			"seekBack",
			"seekForward",
			"togglePiP",
			"toggleFullscreen",
			"modeFile",
			"modeRadio",
			"modeScreen",
			"modeAux",
			"openSettings",
		];
		for (const action of actions) {
			expect(DEFAULT_HOTKEY_BINDINGS[action]).toBeDefined();
			expect(typeof DEFAULT_HOTKEY_BINDINGS[action]).toBe("string");
		}
	});
});

describe("HOTKEY_ACTION_SECTIONS", () => {
	test("全てのアクションが少なくとも 1 つのセクションに含まれる", () => {
		const allActions = HOTKEY_ACTION_SECTIONS.flatMap((s) => s.actions);
		const defined = Object.keys(HOTKEY_ACTION_LABELS) as HotkeyAction[];
		for (const action of defined) {
			expect(allActions).toContain(action);
		}
	});

	test("セクションに重複アクションがない", () => {
		const allActions = HOTKEY_ACTION_SECTIONS.flatMap((s) => s.actions);
		expect(new Set(allActions).size).toBe(allActions.length);
	});
});
