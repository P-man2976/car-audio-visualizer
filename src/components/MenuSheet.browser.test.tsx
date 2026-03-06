/**
 * MenuSheet コンポーネントのブラウザテスト。
 * Sheet の開閉、ボリュームスライダー、設定ボタンを検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

const mockSetVolume = vi.fn();
const mockSetSettingsOpen = vi.fn();
const currentVolume = 50;

vi.mock("jotai", async (importOriginal) => {
	const actual = await importOriginal<typeof import("jotai")>();
	return {
		...actual,
		useAtom: () => [currentVolume, mockSetVolume],
		useSetAtom: () => mockSetSettingsOpen,
	};
});

import { MenuSheet } from "@/components/MenuSheet";

describe("MenuSheet", () => {
	test("トリガーをクリックするとシートが開く", async () => {
		render(
			<MenuSheet>
				<button type="button">メニュー</button>
			</MenuSheet>,
		);

		await page.getByRole("button", { name: "メニュー" }).click();
		// Volume2 アイコンが SVG で表示される
		// 設定ボタン（aria-label="設定"）が見えるはず
		await expect
			.element(page.getByRole("button", { name: "設定" }))
			.toBeInTheDocument();
	});

	test("設定ボタンで setSettingsOpen(true) が呼ばれる", async () => {
		mockSetSettingsOpen.mockClear();
		render(
			<MenuSheet>
				<button type="button">メニュー</button>
			</MenuSheet>,
		);

		await page.getByRole("button", { name: "メニュー" }).click();
		await page.getByRole("button", { name: "設定" }).click();

		expect(mockSetSettingsOpen).toHaveBeenCalledWith(true);
	});

	test("スライダーが表示される", async () => {
		render(
			<MenuSheet>
				<button type="button">メニュー</button>
			</MenuSheet>,
		);

		await page.getByRole("button", { name: "メニュー" }).click();
		await expect.element(page.getByRole("slider")).toBeInTheDocument();
	});
});
