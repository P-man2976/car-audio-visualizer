/**
 * RadioStation コンポーネントのブラウザテスト。
 * ContextMenu は Radix Portal のクリーンアップ問題があるため、
 * 基本レンダリング検証と ContextMenu 検証を分離する。
 */
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

// --- Mocks ---
const mockSelectRadio = vi.fn();
vi.mock("@/hooks/radio", () => ({
	useSelectRadio: () => ({ selectRadio: mockSelectRadio }),
}));

vi.mock("@/services/radiko", () => ({
	useRadikoArea: () => "JP13",
}));

vi.mock("@/services/radio", () => ({
	useRadioFrequencies: () => ({
		data: {
			TBS: {
				type: "FM" as const,
				name: "TBSラジオ",
				area: ["東京"],
				frequencies_fm: [
					{ area: ["東京"], frequency: 90.5, primary: true },
					{ area: ["神奈川"], frequency: 90.5, primary: false },
				],
				frequencies_am: [{ area: ["東京"], frequency: 954, primary: true }],
			},
			QRR: {
				type: "AM" as const,
				name: "文化放送",
				area: ["東京"],
				frequencies_am: [{ area: ["東京"], frequency: 1134, primary: true }],
			},
		},
	}),
}));

// @/atoms/audio はモジュールスコープで AudioContext を生成するためモック
vi.mock("@/atoms/audio", async () => {
	const { atom } = await import("jotai");
	return {
		audioElementAtom: atom({} as unknown as HTMLAudioElement),
		mediaStreamAtom: atom<MediaStream | null>(null),
		audioMotionAnalyzerAtom: atom(null),
	};
});

import { currentSrcAtom } from "@/atoms/player";
import {
	currentRadioAtom,
	customFrequencyAreaAtom,
	radioChannelsByAreaAtom,
	radioStationSizeAtom,
} from "@/atoms/radio";
import { RadioStation } from "@/components/source/RadioStation";

const stationProps = {
	id: "TBS",
	name: "TBSラジオ",
	ascii_name: "TBS RADIO",
	ruby: "ティービーエスラジオ",
	areafree: 0 as const,
	timefree: 1 as const,
	logo: ["https://example.com/tbs.png"],
	banner: "",
	href: "",
	simul_max_delay: 0,
	tf_max_delay: 0,
};

function renderWithStore(
	overrides?: (store: ReturnType<typeof createStore>) => void,
) {
	const store = createStore();
	store.set(currentSrcAtom, "radio");
	store.set(currentRadioAtom, null);
	store.set(radioStationSizeAtom, "lg");
	store.set(customFrequencyAreaAtom, []);
	store.set(radioChannelsByAreaAtom, {});
	overrides?.(store);

	return render(
		<Provider store={store}>
			<RadioStation {...stationProps} />
		</Provider>,
	);
}

describe("RadioStation", () => {
	test("局名とロゴが表示される（size=lg）", async () => {
		renderWithStore();

		await expect.element(page.getByText("TBSラジオ")).toBeInTheDocument();

		// ロゴ画像が表示される
		const img = page.getByRole("img", { name: "TBSラジオ" });
		await expect.element(img).toBeInTheDocument();
		await expect
			.element(img)
			.toHaveAttribute("src", "https://example.com/tbs.png");
	});

	test("FM 局の周波数が MHz 表示される（size=lg）", async () => {
		renderWithStore();

		// 90.5MHz が表示される（FM は小数点 1 桁）
		await expect.element(page.getByText("90.5MHz")).toBeInTheDocument();
	});

	test("クリックで selectRadio が呼ばれる", async () => {
		mockSelectRadio.mockClear();
		renderWithStore();

		await page.getByText("TBSラジオ").click();

		expect(mockSelectRadio).toHaveBeenCalledWith({
			type: "FM",
			source: "radiko",
			id: "TBS",
			name: "TBSラジオ",
			logo: "https://example.com/tbs.png",
			frequency: 90.5,
		});
	});

	test("選択中の局に border スタイルが付与される", async () => {
		renderWithStore((store) => {
			store.set(currentRadioAtom, {
				type: "FM",
				source: "radiko",
				id: "TBS",
				name: "TBSラジオ",
				frequency: 90.5,
			});
		});

		const button = page.getByRole("button");
		await expect.element(button).toHaveClass("border");
	});

	test("size=sm ではロゴのみ表示され名前・周波数は非表示", async () => {
		renderWithStore((store) => {
			store.set(radioStationSizeAtom, "sm");
		});

		// ロゴ画像は表示される
		const img = page.getByRole("img", { name: "TBSラジオ" });
		await expect.element(img).toBeInTheDocument();

		// size=sm では名前テキストは非表示（lg のときのみ表示）
		await expect.element(page.getByText("TBSラジオ")).not.toBeInTheDocument();
		await expect.element(page.getByText("90.5MHz")).not.toBeInTheDocument();
	});

	test("チャンネル割り当てバッジが表示される", async () => {
		renderWithStore((store) => {
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

		// F1 バッジが表示される
		await expect.element(page.getByText("F1")).toBeInTheDocument();
	});
});
