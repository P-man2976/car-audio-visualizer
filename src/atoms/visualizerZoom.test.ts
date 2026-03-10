import { createStore } from "jotai";
import { describe, expect, test } from "vitest";
import { pinchZoomAtom } from "./visualizerZoom";

describe("visualizerZoom atoms", () => {
	test("pinchZoomAtom のデフォルトは 1 (等倍)", () => {
		const store = createStore();
		expect(store.get(pinchZoomAtom)).toBe(1);
	});

	test("ズーム倍率を変更できる", () => {
		const store = createStore();
		store.set(pinchZoomAtom, 2.5);
		expect(store.get(pinchZoomAtom)).toBe(2.5);
	});
});
