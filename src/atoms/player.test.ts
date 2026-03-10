import { describe, expect, test } from "vitest";
import { createStore } from "jotai";
import {
	currentSrcAtom,
	preShuffleQueueAtom,
	repeatModeAtom,
	shuffleAtom,
	volumeAtom,
} from "@/atoms/player";
import type { Song } from "@/types/player";

// player atoms は atomWithIDB を使うが、vitest (Node) 環境では IDB なしで動作する
// (atomWithIDB は get/set が atom と同じインターフェースのため store で直接操作可能)

const makeSong = (id: string, title?: string): Song => ({
	id,
	filename: `${id}.mp3`,
	title: title ?? id,
	track: {},
});

describe("player atoms", () => {
	test("preShuffleQueueAtom の初期値は null", () => {
		const store = createStore();
		expect(store.get(preShuffleQueueAtom)).toBeNull();
	});

	test("preShuffleQueueAtom にキューを保存・復元できる", () => {
		const store = createStore();
		const queue = [makeSong("a"), makeSong("b"), makeSong("c")];
		store.set(preShuffleQueueAtom, queue);
		expect(store.get(preShuffleQueueAtom)).toEqual(queue);

		store.set(preShuffleQueueAtom, null);
		expect(store.get(preShuffleQueueAtom)).toBeNull();
	});

	test("shuffleAtom と repeatModeAtom の初期値", () => {
		const store = createStore();
		expect(store.get(shuffleAtom)).toBe(false);
		expect(store.get(repeatModeAtom)).toBe("off");
	});

	test("volumeAtom の初期値は 100", () => {
		const store = createStore();
		expect(store.get(volumeAtom)).toBe(100);
	});

	test("currentSrcAtom off → file → off のライフサイクル", () => {
		const store = createStore();
		expect(store.get(currentSrcAtom)).toBe("off");
		store.set(currentSrcAtom, "file");
		expect(store.get(currentSrcAtom)).toBe("file");
		store.set(currentSrcAtom, "off");
		expect(store.get(currentSrcAtom)).toBe("off");
	});
});
