/**
 * DisconnectInput コンポーネントのブラウザテスト。
 * ボタンの描画とクリック時の disconnect 呼び出しを検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

const mockDisconnect = vi.fn();
vi.mock("@/hooks/mediastream", () => ({
	useMediaStream: () => ({
		connect: vi.fn(),
		disconnect: mockDisconnect,
	}),
}));

// currentSrcAtom の setAtom をスパイするため、Jotai atom をモック
const mockSetCurrentSrc = vi.fn();
vi.mock("jotai", async (importOriginal) => {
	const actual = await importOriginal<typeof import("jotai")>();
	return {
		...actual,
		useSetAtom: () => mockSetCurrentSrc,
	};
});

import { DisconnectInput } from "@/components/source/DisconnectInput";

describe("DisconnectInput", () => {
	test("「接続解除」ボタンが表示される", async () => {
		render(<DisconnectInput />);
		await expect
			.element(page.getByRole("button", { name: "接続解除" }))
			.toBeInTheDocument();
	});

	test("クリックで disconnect と setCurrentSrc('off') が呼ばれる", async () => {
		mockDisconnect.mockClear();
		mockSetCurrentSrc.mockClear();

		render(<DisconnectInput />);
		await page.getByRole("button", { name: "接続解除" }).click();

		expect(mockDisconnect).toHaveBeenCalledOnce();
		expect(mockSetCurrentSrc).toHaveBeenCalledWith("off");
	});
});
