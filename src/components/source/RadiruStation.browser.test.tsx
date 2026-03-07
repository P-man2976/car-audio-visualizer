/**
 * RadiruStation コンポーネントのブラウザテスト。
 * 3 チャンネル（第一/第二/FM）の表示とクリック時の selectRadio 呼び出しを検証する。
 */
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

const mockSelectRadio = vi.fn();
vi.mock("@/hooks/radio", () => ({
	useSelectRadio: () => ({ selectRadio: mockSelectRadio }),
}));

vi.mock("jotai", async (importOriginal) => {
	const actual = await importOriginal<typeof import("jotai")>();
	return {
		...actual,
		useAtomValue: () => null,
	};
});

import { RadiruStation } from "@/components/source/RadiruStation";

const props = {
	areajp: "東京",
	r1hls: "https://example.com/r1.m3u8",
	r2hls: "https://example.com/r2.m3u8",
	fmhls: "https://example.com/fm.m3u8",
};

describe("RadiruStation", () => {
	test("3 チャンネル（第一/第二/FM）のカードが表示される", async () => {
		render(<RadiruStation {...props} />);
		await expect.element(page.getByText("第一")).toBeInTheDocument();
		await expect.element(page.getByText("第二")).toBeInTheDocument();
		await expect.element(page.getByText("ＦＭ")).toBeInTheDocument();
	});

	test("地域名が表示される", async () => {
		render(<RadiruStation {...props} />);
		// areajp が各カードに表示される
		await expect.element(page.getByText("東京").first()).toBeInTheDocument();
	});

	test("第一をクリックで selectRadio が AM / radiru で呼ばれる", async () => {
		mockSelectRadio.mockClear();
		render(<RadiruStation {...props} />);

		await page.getByText("第一").click();
		expect(mockSelectRadio).toHaveBeenCalledWith({
			type: "AM",
			source: "radiru",
			url: "https://example.com/r1.m3u8",
			name: "ラジオ第一",
		});
	});

	test("FM をクリックで selectRadio が FM / radiru で呼ばれる", async () => {
		mockSelectRadio.mockClear();
		render(<RadiruStation {...props} />);

		await page.getByText("ＦＭ").click();
		expect(mockSelectRadio).toHaveBeenCalledWith({
			type: "FM",
			source: "radiru",
			url: "https://example.com/fm.m3u8",
			name: "NHK-FM",
		});
	});
});
