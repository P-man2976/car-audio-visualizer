import { createStore } from "jotai";
import { describe, expect, test } from "vitest";
import { hlsAtom } from "./hls";

describe("hls atoms", () => {
	test("hlsAtom のデフォルトは null", () => {
		const store = createStore();
		expect(store.get(hlsAtom)).toBeNull();
	});
});
