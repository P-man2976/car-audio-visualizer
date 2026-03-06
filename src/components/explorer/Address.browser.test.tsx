/**
 * Address コンポーネントのブラウザテスト。
 * ナビゲーションボタンの disabled 状態・クリック動作、パンくずリスト表示を検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

const mockBack = vi.fn();
const mockAdvance = vi.fn();
const mockGoUp = vi.fn();

vi.mock("@/hooks/explorer", () => ({
	useAddress: () => ({
		stack: [
			{ name: "root" } as FileSystemDirectoryHandle,
			{ name: "Music" } as FileSystemDirectoryHandle,
			{ name: "Album" } as FileSystemDirectoryHandle,
		],
		forwardStack: [{ name: "next" } as FileSystemDirectoryHandle],
		back: mockBack,
		advance: mockAdvance,
		goUp: mockGoUp,
	}),
}));

import { Address } from "@/components/explorer/Address";

describe("Address", () => {
	test("パンくずリストに現在のスタックが表示される", async () => {
		render(<Address />);
		await expect.element(page.getByText("root")).toBeInTheDocument();
		await expect.element(page.getByText("Music")).toBeInTheDocument();
		await expect.element(page.getByText("Album")).toBeInTheDocument();
	});

	test("戻る・進む・上へボタンが有効", async () => {
		render(<Address />);
		// stack.length > 1 なので canGoBack=true, canGoUp=true
		// forwardStack.length > 0 なので canGoForward=true
		await expect.element(page.getByRole("button").nth(0)).not.toBeDisabled();
		await expect.element(page.getByRole("button").nth(1)).not.toBeDisabled();
		await expect.element(page.getByRole("button").nth(2)).not.toBeDisabled();
	});

	test("戻るボタンクリックで back() が呼ばれる", async () => {
		mockBack.mockClear();
		render(<Address />);
		await page.getByRole("button").nth(0).click();
		expect(mockBack).toHaveBeenCalledOnce();
	});

	test("進むボタンクリックで advance() が呼ばれる", async () => {
		mockAdvance.mockClear();
		render(<Address />);
		await page.getByRole("button").nth(1).click();
		expect(mockAdvance).toHaveBeenCalledOnce();
	});

	test("上へボタンクリックで goUp() が呼ばれる", async () => {
		mockGoUp.mockClear();
		render(<Address />);
		await page.getByRole("button").nth(2).click();
		expect(mockGoUp).toHaveBeenCalledOnce();
	});
});
