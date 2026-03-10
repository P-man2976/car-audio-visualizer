/**
 * QueueSheet コンポーネントのブラウザテスト。
 * ファイルモード（曲キュー / 履歴タブ）とラジオモード（履歴）の描画を検証する。
 */
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

// dnd-kit をシンプルな div 置換でモック
vi.mock("@dnd-kit/core", () => ({
	DndContext: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	closestCenter: vi.fn(),
	useSensor: vi.fn(),
	useSensors: vi.fn(),
	PointerSensor: class {},
	TouchSensor: class {},
}));
vi.mock("@dnd-kit/sortable", () => ({
	SortableContext: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	useSortable: () => ({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		transition: null,
		isDragging: false,
	}),
	verticalListSortingStrategy: {},
}));
vi.mock("@dnd-kit/utilities", () => ({
	CSS: { Transform: { toString: () => undefined } },
}));

// virtua の VList をシンプルな div でモック (テスト環境では CSS 高さが未解決のため)
vi.mock("virtua", () => ({
	VList: ({
		children,
		...props
	}: { children: React.ReactNode } & Record<string, unknown>) => (
		<div {...props}>{children}</div>
	),
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
	useSelectRadio: () => ({ selectRadio: mockSelectRadio }),
}));

// Import after mocks
import {
	currentSongAtom,
	currentSrcAtom,
	queueAtom,
	repeatModeAtom,
	songHistoryAtom,
	songQueueAtom,
} from "@/atoms/player";
import { QueueSheet } from "@/components/QueueSheet";
import type { Song } from "@/types/player";

const makeSong = (overrides: Partial<Song> = {}): Song => ({
	id: "song-1",
	filename: "test-song.mp3",
	title: "テスト曲",
	album: "テストアルバム",
	url: "blob:http://localhost/test",
	track: {},
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
		await expect
			.element(page.getByRole("tab", { name: "再生待ち" }))
			.toBeInTheDocument();
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

	test("ファイルモード: 履歴タブに切り替えると履歴が表示される", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "file");
		store.set(songQueueAtom, []);
		store.set(songHistoryAtom, [
			makeSong({ id: "h1", title: "履歴曲A", album: "アルバムH" }),
			makeSong({ id: "h2", title: "履歴曲B" }),
		]);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		await page.getByRole("tab", { name: "履歴" }).click();
		await expect.element(page.getByText("履歴曲A")).toBeInTheDocument();
		await expect.element(page.getByText("アルバムH")).toBeInTheDocument();
		await expect.element(page.getByText("履歴曲B")).toBeInTheDocument();
	});

	test("ファイルモード: 履歴が空のとき「履歴はありません」", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "file");
		store.set(songQueueAtom, []);
		store.set(songHistoryAtom, []);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		await page.getByRole("tab", { name: "履歴" }).click();
		await expect
			.element(page.getByText("履歴はありません"))
			.toBeInTheDocument();
	});

	test("ファイルモード: キュー曲のコンテキストメニュートリガーが存在する", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "file");
		store.set(songQueueAtom, [makeSong({ id: "s1", title: "右クリック曲" })]);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		// コンテキストメニュートリガーが描画されていることを確認
		// (Radix ContextMenu Portal は右クリックイベントの自動テストが不安定なため操作テストは省略)
		const songText = page.getByText("右クリック曲");
		await expect.element(songText).toBeInTheDocument();
	});

	test("ファイルモード: 履歴曲のコンテキストメニュートリガーが存在する", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "file");
		store.set(songQueueAtom, []);
		store.set(songHistoryAtom, [
			makeSong({ id: "h1", title: "履歴右クリック曲" }),
		]);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		await page.getByRole("tab", { name: "履歴" }).click();
		const songText = page.getByText("履歴右クリック曲");
		await expect.element(songText).toBeInTheDocument();
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

	test("all off モード: ファイルキュータブが表示される", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "off");
		store.set(songQueueAtom, []);
		store.set(songHistoryAtom, [
			makeSong({ id: "h1", title: "オフ時の履歴曲" }),
		]);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		// all off でもファイルタブ（キュー）が表示される
		await expect
			.element(page.getByRole("tab", { name: "再生待ち" }))
			.toBeInTheDocument();
		await page.getByRole("tab", { name: "履歴" }).click();
		await expect.element(page.getByText("オフ時の履歴曲")).toBeInTheDocument();
	});

	test("全曲リピート: キュー末尾に「x曲をリピート」が表示される", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "file");
		store.set(repeatModeAtom, "all");
		store.set(currentSongAtom, makeSong({ id: "current", title: "再生中" }));
		store.set(songQueueAtom, [
			makeSong({ id: "q1", title: "キュー曲1" }),
			makeSong({ id: "q2", title: "キュー曲2" }),
		]);
		store.set(songHistoryAtom, [makeSong({ id: "h1", title: "履歴曲" })]);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		// 1(currentSong) + 2(queue) + 1(history) = 4曲
		await expect.element(page.getByText("4曲をリピート")).toBeInTheDocument();
	});

	test("リピートoff: 「x曲をリピート」が表示されない", async () => {
		const store = createStore();
		store.set(currentSrcAtom, "file");
		store.set(repeatModeAtom, "off");
		store.set(songQueueAtom, [makeSong({ id: "q1", title: "キュー曲" })]);

		render(
			<Provider store={store}>
				<QueueSheet>
					<button type="button">キュー</button>
				</QueueSheet>
			</Provider>,
		);

		await page.getByRole("button", { name: "キュー" }).click();
		await expect.element(page.getByText("キュー曲")).toBeInTheDocument();
		// リピート表示がないことを確認
		const repeatText = page.getByText(/曲をリピート/);
		await expect.element(repeatText).not.toBeInTheDocument();
	});
});
