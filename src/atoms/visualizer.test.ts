import { createStore } from "jotai";
import { describe, expect, test } from "vitest";
import { visualizerStyleAtom } from "./visualizer";

describe("visualizer atoms", () => {
	test("visualizerStyleAtom のデフォルトは 'standard'", () => {
		const store = createStore();
		expect(store.get(visualizerStyleAtom)).toBe("standard");
	});

	test("全スタイルに切り替えられる", () => {
		const store = createStore();
		const styles = [
			"standard",
			"dpx5021m",
			"standard-2d",
			"dpx5021m-2d",
		] as const;
		for (const style of styles) {
			store.set(visualizerStyleAtom, style);
			expect(store.get(visualizerStyleAtom)).toBe(style);
		}
	});
});
