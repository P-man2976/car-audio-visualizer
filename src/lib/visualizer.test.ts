import { describe, expect, it } from "vitest";
import { toBarLevels } from "./visualizer";

describe("toBarLevels", () => {
	it("returns zeros when bars are missing", () => {
		expect(toBarLevels(undefined, 4)).toEqual([0, 0, 0, 0]);
	});

	it("maps and clamps analyzer values", () => {
		const bars = [{ value: [0.2] }, { value: [1.8] }, { value: [-0.4] }];
		expect(toBarLevels(bars, 3)).toEqual([0.2, 1, 0]);
	});
});
