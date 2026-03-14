/**
 * ChannelPresets コンポーネントのブラウザテスト。
 * 1〜6 のチャンネルボタンの表示、選局、登録を検証する。
 */
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

const mockSelectRadio = vi.fn();

vi.mock("@/hooks/radio", () => ({
	useSelectRadio: () => ({ selectRadio: mockSelectRadio, isPending: false }),
}));
vi.mock("@/services/radiko", () => ({
	useRadikoArea: () => "JP13",
}));

// @/atoms/audio はモジュールスコープで AudioContext を生成するためモック
vi.mock("@/atoms/audio", async () => {
	const { atom: a } = await import("jotai");
	return {
		audioElementAtom: a({} as unknown as HTMLAudioElement),
		mediaStreamAtom: a<MediaStream | null>(null),
		audioMotionAnalyzerAtom: a(null),
	};
});

import {
	currentRadioAtom,
	radioChannelsByAreaAtom,
	tuningFreqAtom,
} from "@/atoms/radio";
import { ChannelPresets } from "@/components/player/ChannelPresets";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderPresets(
	overrides?: (store: ReturnType<typeof createStore>) => void,
) {
	const store = createStore();
	store.set(currentRadioAtom, {
		type: "FM",
		source: "radiko",
		id: "TBS",
		name: "TBSラジオ",
		frequency: 90.5,
	});
	store.set(tuningFreqAtom, null);
	store.set(radioChannelsByAreaAtom, {});
	overrides?.(store);

	return {
		store,
		...render(
			<Provider store={store}>
				<TooltipProvider>
					<ChannelPresets />
				</TooltipProvider>
			</Provider>,
		),
	};
}

describe("ChannelPresets", () => {
	test("1〜6 のボタンが表示される", async () => {
		renderPresets();

		for (let i = 1; i <= 6; i++) {
			await expect
				.element(page.getByRole("button", { name: new RegExp(`CH${i}`) }))
				.toBeInTheDocument();
		}
	});

	test("登録済みチャンネルをクリックすると selectRadio が呼ばれる", async () => {
		mockSelectRadio.mockClear();
		renderPresets((store) => {
			store.set(radioChannelsByAreaAtom, {
				JP13: {
					fm: {
						1: {
							freq: 90.5,
							type: "FM",
							stationId: "TBS",
							stationName: "TBSラジオ",
						},
					},
					am: {},
				},
			});
		});

		const btn = page.getByRole("button", { name: /CH1/ });
		await btn.click();

		expect(mockSelectRadio).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "TBS",
				name: "TBSラジオ",
				source: "radiko",
			}),
		);
	});

	test("未登録チャンネルをクリックすると現在の局が登録される", async () => {
		const { store } = renderPresets();

		const btn = page.getByRole("button", { name: /CH3/ });
		await btn.click();

		const channels = store.get(radioChannelsByAreaAtom);
		expect(channels.JP13?.fm[3]).toEqual({
			freq: 90.5,
			type: "FM",
			stationId: "TBS",
			stationName: "TBSラジオ",
		});
	});

	test("未登録チャンネルは薄く表示される", async () => {
		renderPresets();

		const btn = page.getByRole("button", { name: /CH1/ });
		await expect.element(btn).toBeInTheDocument();
		expect(btn.element().className).toContain("opacity-30");
	});

	test("登録済みで選局中のチャンネルにはアクティブスタイルが適用される", async () => {
		renderPresets((store) => {
			store.set(radioChannelsByAreaAtom, {
				JP13: {
					fm: {
						2: {
							freq: 90.5,
							type: "FM",
							stationId: "TBS",
							stationName: "TBSラジオ",
						},
					},
					am: {},
				},
			});
		});

		const btn = page.getByRole("button", { name: /CH2/ });
		await expect.element(btn).toBeInTheDocument();
		expect(btn.element().className).toContain("bg-gray-500/30");
		expect(btn.element().className).toContain("border");
	});

	test("同じ局を別チャンネルに登録すると元のチャンネルから削除される", async () => {
		const { store } = renderPresets((s) => {
			s.set(radioChannelsByAreaAtom, {
				JP13: {
					fm: {
						1: {
							freq: 90.5,
							type: "FM",
							stationId: "TBS",
							stationName: "TBSラジオ",
						},
					},
					am: {},
				},
			});
		});

		// CH4 (未登録) をクリック → 現在の局(TBS)を CH4 に登録
		const btn = page.getByRole("button", { name: /CH4/ });
		await btn.click();

		const channels = store.get(radioChannelsByAreaAtom);
		// CH1 から削除されている
		expect(channels.JP13?.fm[1]).toBeUndefined();
		// CH4 に登録されている
		expect(channels.JP13?.fm[4]).toEqual({
			freq: 90.5,
			type: "FM",
			stationId: "TBS",
			stationName: "TBSラジオ",
		});
	});
});
