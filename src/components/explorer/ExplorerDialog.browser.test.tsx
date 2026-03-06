/**
 * ExplorerDialog コンポーネントのブラウザテスト。
 * Address・FileEntries はスタブ化し、ダイアログの UI 状態と
 * サイドバー（保存済みフォルダ）・送信ボタンの動作を検証する。
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi, beforeEach } from "vitest";

// --- Mock child components ---
vi.mock("@/components/explorer/Address", () => ({
	Address: () => <div data-testid="address" />,
}));
vi.mock("@/components/explorer/FileEntries", () => ({
	FileEntries: () => <div data-testid="file-entries" />,
}));

// --- Mock @/atoms/audio (module-scope AudioContext side effects) ---
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

// --- Mock @/atoms/player (avoid atomWithIDB serialization of mock handles) ---
vi.mock("@/atoms/player", async () => {
	const { atom } = await import("jotai");
	return {
		currentSongAtom: atom<null>(null),
		currentSrcAtom: atom("off"),
		savedDirectoryHandlesAtom: atom<FileSystemDirectoryHandle[]>([]),
		songQueueAtom: atom<unknown[]>([]),
	};
});

// --- Mock useAddress ---
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

import { explorerSelectedFilesAtom } from "@/atoms/explorer";
import { savedDirectoryHandlesAtom } from "@/atoms/player";
import { ExplorerDialog } from "@/components/explorer/ExplorerDialog";
import { Button } from "@/components/ui/button";

/** FileSystemDirectoryHandle の簡易モック */
function makeFakeDirHandle(name: string): FileSystemDirectoryHandle {
	return {
		kind: "directory",
		name,
		entries: () => [][Symbol.iterator](),
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
			/* no entries */
		},
	} as unknown as FileSystemDirectoryHandle;
}

function renderDialog(
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
					<ExplorerDialog>
						<Button data-testid="trigger">エクスプローラーを開く</Button>
					</ExplorerDialog>
				</Provider>
			</QueryClientProvider>,
		),
	};
}

beforeEach(() => {
	mockPush.mockClear();
});

describe("ExplorerDialog", () => {
	test("トリガーをクリックするとダイアログが開く", async () => {
		renderDialog();

		await page.getByTestId("trigger").click();

		// stack が空なので「フォルダを選択」が表示される
		await expect.element(page.getByText("フォルダを選択")).toBeInTheDocument();
	});

	test("ファイル未選択時は送信ボタンが無効", async () => {
		renderDialog();

		await page.getByTestId("trigger").click();

		const button = page.getByRole("button", {
			name: /選択したファイルを読み込む/,
		});
		await expect.element(button).toBeDisabled();
	});

	test("選択ファイルがある場合ボタンテキストに件数が表示される", async () => {
		const fakeFile = {
			kind: "file" as const,
			name: "song.mp3",
		} as FileSystemFileHandle;

		renderDialog((store) => {
			store.set(explorerSelectedFilesAtom, [fakeFile]);
		});

		await page.getByTestId("trigger").click();

		await expect
			.element(page.getByText("選択したファイルを読み込む (1件)"))
			.toBeInTheDocument();
	});

	test("保存済みフォルダが表示される", async () => {
		const dir1 = makeFakeDirHandle("MyMusic");
		const dir2 = makeFakeDirHandle("Podcasts");

		renderDialog((store) => {
			store.set(savedDirectoryHandlesAtom, [dir1, dir2]);
		});

		await page.getByTestId("trigger").click();

		await expect.element(page.getByText("MyMusic")).toBeInTheDocument();
		await expect.element(page.getByText("Podcasts")).toBeInTheDocument();
		await expect
			.element(page.getByText("保存済みフォルダ"))
			.toBeInTheDocument();
	});

	test("Address と FileEntries がダイアログ内に表示される", async () => {
		renderDialog();

		await page.getByTestId("trigger").click();

		await expect.element(page.getByTestId("address")).toBeInTheDocument();
		await expect.element(page.getByTestId("file-entries")).toBeInTheDocument();
	});

	test("保存済みフォルダをクリックすると push が呼ばれる", async () => {
		const dir = makeFakeDirHandle("Albums");

		renderDialog((store) => {
			store.set(savedDirectoryHandlesAtom, [dir]);
		});

		await page.getByTestId("trigger").click();

		await expect.element(page.getByText("Albums")).toBeInTheDocument();

		// auto-open effect で push が呼ばれた後にクリア
		mockPush.mockClear();
		await page.getByText("Albums").click();

		expect(mockPush).toHaveBeenCalledOnce();
	});
});
