/**
 * dotmatrix-font.ts — FONT_5X7 構造バリデーションテスト
 */
import { describe, expect, test } from "vitest";
import { FONT_5X7 } from "@/lib/dotmatrix-font";

describe("FONT_5X7", () => {
	test("全エントリが 7 要素の配列である", () => {
		for (const [_char, rows] of Object.entries(FONT_5X7)) {
			expect(rows).toHaveLength(7);
			// 各行情報を持つ
			for (const row of rows) {
				expect(typeof row).toBe("number");
			}
		}
	});

	test("各行が 5 ビット幅に収まる (0–31)", () => {
		for (const [, rows] of Object.entries(FONT_5X7)) {
			for (const row of rows) {
				expect(row).toBeGreaterThanOrEqual(0);
				expect(row).toBeLessThanOrEqual(0b11111);
			}
		}
	});

	test("ASCII 数字 0–9 が含まれる", () => {
		for (let i = 0; i <= 9; i++) {
			expect(FONT_5X7[String(i)]).toBeDefined();
		}
	});

	test("ASCII 大文字 A–Z が含まれる", () => {
		for (let code = 65; code <= 90; code++) {
			expect(FONT_5X7[String.fromCharCode(code)]).toBeDefined();
		}
	});

	test("スペースのビットマップが全て 0 である", () => {
		const space = FONT_5X7[" "];
		expect(space).toBeDefined();
		expect(space.every((v) => v === 0)).toBe(true);
	});
});
