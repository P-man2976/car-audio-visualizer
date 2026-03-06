/**
 * ScreenShare コンポーネントのブラウザテスト。
 * ボタンの描画とクリック時の connect 呼び出しを検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

const mockConnect = vi.fn();
vi.mock("@/hooks/mediastream", () => ({
	useMediaStream: () => ({
		connect: mockConnect,
		disconnect: vi.fn(),
	}),
}));

// getDisplayMedia をモック（navigator.mediaDevices はブラウザ環境で存在しない場合がある）
const mockStream = { getTracks: () => [] } as unknown as MediaStream;
if (!navigator.mediaDevices) {
	Object.defineProperty(navigator, "mediaDevices", {
		value: { getDisplayMedia: vi.fn().mockResolvedValue(mockStream) },
	});
} else {
	vi.spyOn(navigator.mediaDevices, "getDisplayMedia").mockResolvedValue(
		mockStream,
	);
}

// vi.mock が巻き上げられた後にインポート
import { ScreenShare } from "@/components/source/ScreenShare";

describe("ScreenShare", () => {
	test("「PC上の音声を共有」ボタンが表示される", async () => {
		render(<ScreenShare />);
		await expect
			.element(page.getByRole("button", { name: "PC上の音声を共有" }))
			.toBeInTheDocument();
	});

	test("クリックで connect が呼ばれる", async () => {
		mockConnect.mockClear();
		render(<ScreenShare />);

		await page.getByRole("button", { name: "PC上の音声を共有" }).click();
		// getDisplayMedia は非同期なので少し待つ
		await vi.waitFor(() => {
			expect(mockConnect).toHaveBeenCalledOnce();
		});
	});
});
