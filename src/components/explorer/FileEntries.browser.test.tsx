/**
 * FileEntries コンポーネントのブラウザテスト。
 * FileSystemDirectoryHandle をモックして、フォルダ/ファイル一覧の表示、
 * 選択状態のトグル、フォルダクリック時の push を検証する。
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

// --- Mocks ---

// @/atoms/audio はモジュールスコープで AudioContext を生成するためモック
vi.mock("@/atoms/audio", async () => {
	const { atom } = await import("jotai");
	return {
		audioElementAtom: atom({
			canPlayType: (mimeType: string) =>
				mimeType.includes("audio") ? "maybe" : "",
		} as unknown as HTMLAudioElement),
		mediaStreamAtom: atom<MediaStream | null>(null),
		audioMotionAnalyzerAtom: atom(null),
	};
});

const mockPush = vi.fn();
vi.mock("@/hooks/explorer", () => ({
	useAddress: () => ({
		stack: [],
		forwardStack: [],
		back: vi.fn(),
		advance: vi.fn(),
		goUp: vi.fn(),
		push: mockPush,
	}),
}));

import {
	explorerNavigationStackAtom,
	explorerSelectedFilesAtom,
} from "@/atoms/explorer";
import { FileEntries } from "@/components/explorer/FileEntries";

/** FileSystemFileHandle のモック */
function makeFakeFileHandle(name: string): FileSystemFileHandle {
	return {
		kind: "file",
		name,
		getFile: vi.fn(),
		createWritable: vi.fn(),
		createSyncAccessHandle: vi.fn(),
		isSameEntry: vi.fn(),
		queryPermission: vi.fn(),
		requestPermission: vi.fn(),
	} as unknown as FileSystemFileHandle;
}

/** FileSystemDirectoryHandle のモック */
function makeFakeDirHandle(
	name: string,
	children: [string, FileSystemFileHandle | FileSystemDirectoryHandle][],
): FileSystemDirectoryHandle {
	return {
		kind: "directory",
		name,
		entries: () => children[Symbol.iterator](),
		getDirectoryHandle: vi.fn(),
		getFileHandle: vi.fn(),
		removeEntry: vi.fn(),
		resolve: vi.fn(),
		isSameEntry: vi.fn(),
		queryPermission: vi.fn(),
		requestPermission: vi.fn(),
		keys: vi.fn(),
		values: vi.fn(),
		[Symbol.asyncIterator]: async function* () {
			for (const [, handle] of children) {
				yield handle;
			}
		},
	} as unknown as FileSystemDirectoryHandle;
}

function renderEntries(
	overrides?: (store: ReturnType<typeof createStore>) => void,
) {
	const store = createStore();
	overrides?.(store);

	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return {
		store,
		...render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<FileEntries />
				</Provider>
			</QueryClientProvider>,
		),
	};
}

describe("FileEntries", () => {
	test("currentDir が null の場合「フォルダが選択されていません」が表示される", async () => {
		renderEntries();

		await expect
			.element(page.getByText("フォルダが選択されていません"))
			.toBeInTheDocument();
	});

	test("ディレクトリエントリが一覧表示される", async () => {
		const mp3File = makeFakeFileHandle("song.mp3");
		const subDir = makeFakeDirHandle("SubFolder", []);
		const dir = makeFakeDirHandle("Music", [
			["SubFolder", subDir],
			["song.mp3", mp3File],
		]);

		renderEntries((store) => {
			store.set(explorerNavigationStackAtom, [dir]);
		});

		// react-query でデータ取得を待つ
		await expect.element(page.getByText("SubFolder")).toBeInTheDocument();
		await expect.element(page.getByText("song.mp3")).toBeInTheDocument();
	});

	test("ファイルをクリックすると選択状態がトグルされる", async () => {
		const mp3File = makeFakeFileHandle("test.mp3");
		const dir = makeFakeDirHandle("Music", [["test.mp3", mp3File]]);

		const { store } = renderEntries((store) => {
			store.set(explorerNavigationStackAtom, [dir]);
		});

		// エントリ表示を待つ
		await expect.element(page.getByText("test.mp3")).toBeInTheDocument();

		// ファイルをクリック → 選択
		await page.getByText("test.mp3").click();

		const selected = store.get(explorerSelectedFilesAtom);
		expect(selected).toHaveLength(1);
		expect(selected[0].name).toBe("test.mp3");
	});

	test("フォルダをクリックすると push が呼ばれる", async () => {
		mockPush.mockClear();
		const subDir = makeFakeDirHandle("Albums", []);
		const dir = makeFakeDirHandle("Music", [["Albums", subDir]]);

		renderEntries((store) => {
			store.set(explorerNavigationStackAtom, [dir]);
		});

		await expect.element(page.getByText("Albums")).toBeInTheDocument();

		await page.getByText("Albums").click();

		expect(mockPush).toHaveBeenCalledOnce();
	});
});
