/**
 * SourceSheet コンポーネントのブラウザテスト。
 * 子コンポーネント (RadioStation, RadiruStation, ExternalInput 等) はモックし、
 * Sheet の表示、3 タブの切り替え、currentSrc 変更ロジックを検証する。
 */
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

// --- Mocks ---

// @/atoms/audio はモジュールスコープで AudioContext を生成するためモック
vi.mock("@/atoms/audio", async () => {
	const { atom } = await import("jotai");
	return {
		audioElementAtom: atom({} as unknown as HTMLAudioElement),
		mediaStreamAtom: atom<MediaStream | null>(null),
		audioMotionAnalyzerAtom: atom(null),
	};
});

const mockDisconnect = vi.fn();
vi.mock("@/hooks/mediastream", () => ({
	useMediaStream: () => ({
		connect: vi.fn(),
		disconnect: mockDisconnect,
	}),
}));

vi.mock("@/services/radiko", () => ({
	useRadikoStationList: () => ({
		data: [
			{
				id: "TBS",
				name: "TBSラジオ",
				ascii_name: "TBS",
				ruby: "",
				areafree: 0,
				timefree: 1,
				logo: [],
				banner: "",
				href: "",
				simul_max_delay: 0,
				tf_max_delay: 0,
			},
		],
	}),
}));

vi.mock("@/services/radiru", () => ({
	useRadiruStationList: () => ({
		data: [
			{
				areajp: "東京",
				area: "tokyo",
				apikey: 1,
				areakey: 130,
				r1hls: "r1.m3u8",
				r2hls: "r2.m3u8",
				fmhls: "fm.m3u8",
			},
		],
	}),
}));

// 子コンポーネントをシンプルなスタブに置き換え
vi.mock("@/components/source/RadioStation", () => ({
	RadioStation: ({ name }: { name: string }) => (
		<div data-testid="radio-station">{name}</div>
	),
}));

vi.mock("@/components/source/RadiruStation", () => ({
	RadiruStation: ({ areajp }: { areajp: string }) => (
		<div data-testid="radiru-station">{areajp}</div>
	),
}));

vi.mock("@/components/source/DisconnectInput", () => ({
	DisconnectInput: () => <div data-testid="disconnect-input">Disconnect</div>,
}));

vi.mock("@/components/source/ExternalInput", () => ({
	ExternalInput: () => <div data-testid="external-input">ExternalInput</div>,
}));

vi.mock("@/components/source/ScreenShare", () => ({
	ScreenShare: () => <div data-testid="screen-share">ScreenShare</div>,
}));

vi.mock("@/components/FilePicker", () => ({
	FilePicker: () => <div data-testid="file-picker">FilePicker</div>,
}));

vi.mock("@/components/explorer/ExplorerDialog", () => ({
	ExplorerDialog: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="explorer-dialog">{children}</div>
	),
}));

import { currentSrcAtom } from "@/atoms/player";
import { mediaStreamAtom } from "@/atoms/audio";
import { radioStationSizeAtom } from "@/atoms/radio";
import { SourceSheet } from "@/components/SourceSheet";
import { Button } from "@/components/ui/button";

function renderSheet(
	overrides?: (store: ReturnType<typeof createStore>) => void,
) {
	const store = createStore();
	store.set(currentSrcAtom, "off");
	store.set(radioStationSizeAtom, "lg");
	overrides?.(store);

	return {
		store,
		...render(
			<Provider store={store}>
				<SourceSheet>
					<Button>開く</Button>
				</SourceSheet>
			</Provider>,
		),
	};
}

describe("SourceSheet", () => {
	test("Sheet を開くと 3 つのタブ（ファイル/ラジオ/外部入力）が表示される", async () => {
		renderSheet();

		await page.getByText("開く").click();
		await new Promise((r) => setTimeout(r, 200));

		await expect
			.element(page.getByRole("tab", { name: "ファイル" }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole("tab", { name: "ラジオ" }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole("tab", { name: "外部入力" }))
			.toBeInTheDocument();
	});

	test("ラジオタブを選択すると Radiko/らじる 局リストが表示される", async () => {
		const { store } = renderSheet();

		await page.getByText("開く").click();
		await new Promise((r) => setTimeout(r, 200));

		await page.getByRole("tab", { name: "ラジオ" }).click();

		// store の currentSrc が "radio" に変更される
		expect(store.get(currentSrcAtom)).toBe("radio");

		// RadioStation スタブが表示される
		await expect.element(page.getByTestId("radio-station")).toBeInTheDocument();

		// RadiruStation スタブが表示される
		await expect
			.element(page.getByTestId("radiru-station"))
			.toBeInTheDocument();
	});

	test("外部入力タブで mediaStream なしの場合 ScreenShare と ExternalInput が表示される", async () => {
		renderSheet();

		await page.getByText("開く").click();
		await new Promise((r) => setTimeout(r, 200));

		await page.getByRole("tab", { name: "外部入力" }).click();

		await expect.element(page.getByTestId("screen-share")).toBeInTheDocument();
		await expect
			.element(page.getByTestId("external-input"))
			.toBeInTheDocument();
	});

	test("外部入力タブで mediaStream ありの場合 DisconnectInput が表示される", async () => {
		renderSheet((store) => {
			store.set(mediaStreamAtom, {} as unknown as MediaStream);
		});

		await page.getByText("開く").click();
		await new Promise((r) => setTimeout(r, 200));

		await page.getByRole("tab", { name: "外部入力" }).click();

		await expect
			.element(page.getByTestId("disconnect-input"))
			.toBeInTheDocument();
	});

	test("aux から別タブに切り替えると disconnect が呼ばれる", async () => {
		mockDisconnect.mockClear();
		renderSheet((store) => {
			store.set(currentSrcAtom, "aux");
		});

		await page.getByText("開く").click();
		await new Promise((r) => setTimeout(r, 200));

		// aux 状態から file タブに切り替え
		await page.getByRole("tab", { name: "ファイル" }).click();

		expect(mockDisconnect).toHaveBeenCalledOnce();
	});

	test("ファイルタブに FilePicker が表示される", async () => {
		renderSheet((store) => {
			store.set(currentSrcAtom, "file");
		});

		await page.getByText("開く").click();
		await new Promise((r) => setTimeout(r, 200));

		await expect.element(page.getByTestId("file-picker")).toBeInTheDocument();
	});
});
