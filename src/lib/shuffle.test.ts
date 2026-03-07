import { describe, expect, test, vi } from "vitest";
import { shuffleArray } from "./shuffle";

describe("shuffleArray", () => {
	test("元の配列と同じ長さの新しい配列を返す", () => {
		const input = [1, 2, 3, 4, 5];
		const result = shuffleArray(input);
		expect(result).toHaveLength(input.length);
		expect(result).not.toBe(input); // 新しい配列
	});

	test("元の配列を変更しない", () => {
		const input = [1, 2, 3, 4, 5];
		const copy = [...input];
		shuffleArray(input);
		expect(input).toEqual(copy);
	});

	test("同じ要素をすべて含む", () => {
		const input = [10, 20, 30, 40, 50];
		const result = shuffleArray(input);
		expect(result.sort((a, b) => a - b)).toEqual(input.sort((a, b) => a - b));
	});

	test("空配列はそのまま返す", () => {
		expect(shuffleArray([])).toEqual([]);
	});

	test("要素が1つの配列はそのまま返す", () => {
		expect(shuffleArray([42])).toEqual([42]);
	});

	test("十分に大きな配列で順序が変わる（統計的テスト）", () => {
		const input = Array.from({ length: 20 }, (_, i) => i);
		// 10回試行して、少なくとも1回は異なる順序になるはず
		const allSame = Array.from({ length: 10 }, () =>
			shuffleArray(input).join(","),
		).every((s) => s === input.join(","));
		expect(allSame).toBe(false);
	});

	test("Math.random を固定するとシャッフル結果が決定的になる", () => {
		let callCount = 0;
		vi.spyOn(Math, "random").mockImplementation(() => {
			// 各呼び出しで決定的な値を返す
			return [0.1, 0.9, 0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6][callCount++ % 9];
		});

		const result1 = shuffleArray([1, 2, 3, 4, 5]);

		callCount = 0;
		const result2 = shuffleArray([1, 2, 3, 4, 5]);

		expect(result1).toEqual(result2);
		vi.restoreAllMocks();
	});
});
