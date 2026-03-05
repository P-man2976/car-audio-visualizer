/**
 * amFilter.ts のユニットテスト
 *
 * AM フィルタ設定アトムのデフォルト値と定数を検証する。
 */
import { describe, expect, it } from "vitest";
import { AM_FILTER_FREQ, AM_HPF_FREQ } from "./amFilter";

describe("AM_FILTER_FREQ", () => {
	it("4500Hz（AM 放送帯域の上限付近）である", () => {
		expect(AM_FILTER_FREQ).toBe(4500);
	});

	it("正の数である", () => {
		expect(AM_FILTER_FREQ).toBeGreaterThan(0);
	});

	it("可聴域（20Hz〜20kHz）内である", () => {
		expect(AM_FILTER_FREQ).toBeGreaterThanOrEqual(20);
		expect(AM_FILTER_FREQ).toBeLessThanOrEqual(20000);
	});
});

describe("AM_HPF_FREQ", () => {
	it("30Hz（超低域カット）である", () => {
		expect(AM_HPF_FREQ).toBe(30);
	});

	it("LPF のカットオフより低い", () => {
		expect(AM_HPF_FREQ).toBeLessThan(AM_FILTER_FREQ);
	});
});
