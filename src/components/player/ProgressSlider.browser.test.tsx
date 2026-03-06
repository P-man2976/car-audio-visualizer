/**
 * ProgressSlider コンポーネントのブラウザテスト。
 * currentSrc ごとの 3 パターン（off / radio / file）の描画を検証する。
 */
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

// --- Atom mocks ---
// @/atoms/audio はモジュールスコープで AudioContext を生成するため全体モック
vi.mock("@/atoms/audio", async () => {
	const { atom } = await import("jotai");
	return {
		audioElementAtom: atom({
			currentTime: 30,
			duration: 180,
		} as unknown as HTMLAudioElement),
		mediaStreamAtom: atom<MediaStream | null>(null),
		audioMotionAnalyzerAtom: atom(null),
	};
});

vi.mock("@/services/radiko", () => ({
	useRadikoArea: () => null,
}));

// Import after mocks
import { currentSrcAtom, progressAtom } from "@/atoms/player";
import { currentRadioAtom, tuningFreqAtom } from "@/atoms/radio";
import { ProgressSlider } from "@/components/player/ProgressSlider";

describe("ProgressSlider", () => {
	test("currentSrc=off で空バーが表示される", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "off");
		store.set(progressAtom, 0);

		render(
			<Provider store={store}>
				<ProgressSlider />
			</Provider>,
		);

		// off 状態は bg-secondary の空バー div のみ
		// slider は表示されない
		await expect.element(page.getByRole("slider")).not.toBeInTheDocument();
		// ＬＩＶＥ テキストも表示されない
		await expect.element(page.getByText("ＬＩＶＥ")).not.toBeInTheDocument();
	});

	test("currentSrc=radio で ＬＩＶＥ が表示される", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "radio");
		store.set(progressAtom, 0);
		store.set(currentRadioAtom, null);
		store.set(tuningFreqAtom, null);

		render(
			<Provider store={store}>
				<ProgressSlider />
			</Provider>,
		);

		await expect.element(page.getByText("ＬＩＶＥ")).toBeInTheDocument();
		await expect.element(page.getByRole("slider")).not.toBeInTheDocument();
	});

	test("currentSrc=file でスライダーと時間が表示される", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "file");
		store.set(progressAtom, 30);

		render(
			<Provider store={store}>
				<ProgressSlider />
			</Provider>,
		);

		// Slider が表示される
		await expect.element(page.getByRole("slider")).toBeInTheDocument();

		// 経過時間 0:30
		await expect.element(page.getByText("0:30")).toBeInTheDocument();

		// 楽曲の長さ 3:00
		await expect.element(page.getByText("3:00")).toBeInTheDocument();
	});

	test("currentSrc=aux で ＬＩＶＥ が表示される", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "aux");
		store.set(progressAtom, 0);

		render(
			<Provider store={store}>
				<ProgressSlider />
			</Provider>,
		);

		await expect.element(page.getByText("ＬＩＶＥ")).toBeInTheDocument();
	});
});
