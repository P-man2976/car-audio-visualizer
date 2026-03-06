/**
 * QueueSheet コンポーネントのブラウザテスト。
 * ファイルモード（曲キュー）とラジオモード（履歴）の描画を検証する。
 */
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

// framer-motion の Reorder をシンプルな div 置換でモック
vi.mock("framer-motion", () => ({
	Reorder: {
		Group: ({
			children,
			...props
		}: { children: React.ReactNode } & Record<string, unknown>) => (
			<div {...props}>{children}</div>
		),
		Item: ({
			children,
			...props
		}: { children: React.ReactNode } & Record<string, unknown>) => (
			<div {...props}>{children}</div>
		),
	},
	useDragControls: () => ({ start: vi.fn() }),
}));

const mockSkipTo = vi.fn();
vi.mock("@/hooks/player", () => ({
	usePlayer: () => ({
		skipTo: mockSkipTo,
		play: vi.fn(),
		pause: vi.fn(),
		next: vi.fn(),
		prev: vi.fn(),
	}),
}));

const mockSelectRadio = vi.fn();
vi.mock("@/hooks/radio", () => ({
	useSelectRadio: () => mockSelectRadio,
}));

// Import after mocks
import { currentSrcAtom, queueAtom, songQueueAtom } from "@/atoms/player";
import { QueueSheet } from "@/components/QueueSheet";
import type { Song } from "@/types/player";

const makeSong = (overrides: Partial<Song> = {}): Song => ({
	id: "song-1",
	filename: "test-song.mp3",
	title: "テスト曲",
	album: "テストアルバム",
	url: "blob:http://localhost/test",
	...overrides,
});

describe("QueueSheet", () => {
	test("ファイルモード: 曲キューが空のとき「キューは空です」", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "file");
		store.set(songQueueAtom, []);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		await expect.element(page.getByText("再生待ち")).toBeInTheDocument();
		await expect.element(page.getByText("キューは空です")).toBeInTheDocument();
	});

	test("ファイルモード: 曲が表示される", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "file");
		store.set(songQueueAtom, [
			makeSong({ id: "s1", title: "曲A", album: "アルバムX" }),
			makeSong({ id: "s2", title: "曲B", filename: "song-b.flac" }),
		]);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		await expect.element(page.getByText("曲A")).toBeInTheDocument();
		await expect.element(page.getByText("アルバムX")).toBeInTheDocument();
		await expect.element(page.getByText("曲B")).toBeInTheDocument();
	});

	test("ラジオモード: 空キューで「キューは空です」", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "radio");
		store.set(queueAtom, []);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		await expect.element(page.getByText("最近再生した局")).toBeInTheDocument();
		await expect.element(page.getByText("キューは空です")).toBeInTheDocument();
	});

	test("ラジオモード: 局カードが表示される", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "radio");
		store.set(queueAtom, [
			{
				type: "FM",
				source: "radiko",
				id: "TBS",
				url: "https://example.com/tbs",
				name: "TBSラジオ",
				frequency: 90.5,
			},
		]);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		await expect.element(page.getByText("TBSラジオ")).toBeInTheDocument();
		await expect.element(page.getByText("90.5 MHz")).toBeInTheDocument();
	});
});
