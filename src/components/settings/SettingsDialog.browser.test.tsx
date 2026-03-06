/**
 * SettingsDialog コンポーネントのブラウザテスト。
 * ダイアログ表示、タブナビゲーション、VisualizerPane の選択、
 * LastfmPane の連携状態表示を検証する。
 */
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

// useMediaQuery をモック — デスクトップ幅に固定
vi.mock("@/hooks/useMediaQuery", () => ({
	useMediaQuery: () => true,
}));

import { settingsOpenAtom } from "@/atoms/hotkeys";
import { lastfmSessionAtom } from "@/atoms/lastfm";
import { visualizerStyleAtom } from "@/atoms/visualizer";
import { SettingsDialog } from "@/components/settings/SettingsDialog";

function renderDialog(
	overrides?: (store: ReturnType<typeof createStore>) => void,
) {
	const store = createStore();
	store.set(settingsOpenAtom, true);
	overrides?.(store);

	return {
		store,
		...render(
			<Provider store={store}>
				<SettingsDialog />
			</Provider>,
		),
	};
}

describe("SettingsDialog", () => {
	test("ダイアログが開いて「設定」タイトルが表示される", async () => {
		renderDialog();

		await expect.element(page.getByText("設定")).toBeInTheDocument();
	});

	test("4 つのナビゲーションタブが表示される", async () => {
		renderDialog();

		await expect
			.element(page.getByRole("tab", { name: "ビジュアライザー" }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole("tab", { name: "オーディオ解析" }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole("tab", { name: "Last.fm" }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole("tab", { name: "ショートカット" }))
			.toBeInTheDocument();
	});

	test("ビジュアライザーペインでスタイル選択カードが表示される", async () => {
		renderDialog();

		// デフォルトで visualizer タブが表示される
		// aria-pressed ボタンでスタイルカードを確認
		const cards = page.getByRole("button", { pressed: true });
		await expect.element(cards).toBeInTheDocument();

		// 各カードのラベル（aria-pressed button 内のテキスト）
		await expect
			.element(page.getByRole("button", { name: /スタンダード（3D）/ }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole("button", { name: /DPX-5021M/ }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole("button", { name: /スタンダード（2D）/ }))
			.toBeInTheDocument();
	});

	test("ビジュアライザーのカードをクリックでスタイルが変更される", async () => {
		const { store } = renderDialog();

		// DPX-5021M カードを選択
		await page.getByRole("button", { name: /DPX-5021M/ }).click();

		expect(store.get(visualizerStyleAtom)).toBe("dpx5021m");
	});

	test("オーディオ解析タブに切り替えると FFT サイズ等の設定が表示される", async () => {
		renderDialog();

		await page.getByRole("tab", { name: "オーディオ解析" }).click();

		await expect.element(page.getByText("FFT サイズ")).toBeInTheDocument();
	});

	test("Last.fm タブ: 未連携状態で連携ボタンが表示される", async () => {
		renderDialog();

		await page.getByRole("tab", { name: "Last.fm" }).click();

		await expect
			.element(page.getByRole("button", { name: "Last.fm と連携する" }))
			.toBeInTheDocument();
	});

	test("Last.fm タブ: 連携状態でユーザー名と解除ボタンが表示される", async () => {
		renderDialog((store) => {
			store.set(lastfmSessionAtom, {
				name: "testuser",
				key: "abc123",
				subscriber: 0,
			});
		});

		await page.getByRole("tab", { name: "Last.fm" }).click();

		await expect.element(page.getByText("testuser")).toBeInTheDocument();
		await expect.element(page.getByText("連携中")).toBeInTheDocument();
		await expect.element(page.getByText("連携を解除する")).toBeInTheDocument();
	});

	test("Last.fm 連携解除ボタンでセッションがクリアされる", async () => {
		const { store } = renderDialog((store) => {
			store.set(lastfmSessionAtom, {
				name: "testuser",
				key: "abc123",
				subscriber: 0,
			});
		});

		await page.getByRole("tab", { name: "Last.fm" }).click();
		await page.getByText("連携を解除する").click();

		expect(store.get(lastfmSessionAtom)).toBeNull();
	});

	test("ショートカットタブに切り替えるとキー割り当てが表示される", async () => {
		renderDialog();

		await page.getByRole("tab", { name: "ショートカット" }).click();

		// ショートカットのラベルが表示される
		await expect.element(page.getByText("リセット")).toBeInTheDocument();
	});
});
