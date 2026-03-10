import { createStore } from "jotai";
import { describe, expect, test } from "vitest";
import {
	explorerCurrentDirAtom,
	explorerForwardStackAtom,
	explorerNavigationStackAtom,
	explorerSelectedFilesAtom,
} from "./explorer";

describe("explorer atoms", () => {
	test("explorerNavigationStackAtom のデフォルトは空配列", () => {
		const store = createStore();
		expect(store.get(explorerNavigationStackAtom)).toEqual([]);
	});

	test("explorerForwardStackAtom のデフォルトは空配列", () => {
		const store = createStore();
		expect(store.get(explorerForwardStackAtom)).toEqual([]);
	});

	test("explorerSelectedFilesAtom のデフォルトは空配列", () => {
		const store = createStore();
		expect(store.get(explorerSelectedFilesAtom)).toEqual([]);
	});

	describe("explorerCurrentDirAtom (derived)", () => {
		test("ナビゲーションスタックが空のとき null を返す", () => {
			const store = createStore();
			expect(store.get(explorerCurrentDirAtom)).toBeNull();
		});

		test("スタックの最後の要素を返す", () => {
			const store = createStore();
			const dir1 = { name: "dir1" } as unknown as FileSystemDirectoryHandle;
			const dir2 = { name: "dir2" } as unknown as FileSystemDirectoryHandle;
			store.set(explorerNavigationStackAtom, [dir1, dir2]);
			expect(store.get(explorerCurrentDirAtom)).toBe(dir2);
		});

		test("スタックが 1 要素のときその要素を返す", () => {
			const store = createStore();
			const root = { name: "root" } as unknown as FileSystemDirectoryHandle;
			store.set(explorerNavigationStackAtom, [root]);
			expect(store.get(explorerCurrentDirAtom)).toBe(root);
		});

		test("スタックの更新に追従する", () => {
			const store = createStore();
			const dir1 = { name: "dir1" } as unknown as FileSystemDirectoryHandle;
			const dir2 = { name: "dir2" } as unknown as FileSystemDirectoryHandle;

			store.set(explorerNavigationStackAtom, [dir1]);
			expect(store.get(explorerCurrentDirAtom)).toBe(dir1);

			store.set(explorerNavigationStackAtom, [dir1, dir2]);
			expect(store.get(explorerCurrentDirAtom)).toBe(dir2);

			store.set(explorerNavigationStackAtom, []);
			expect(store.get(explorerCurrentDirAtom)).toBeNull();
		});
	});
});
