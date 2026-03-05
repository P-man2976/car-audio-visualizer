/**
 * amFilter.ts / audio.ts のユニットテスト
 *
 * AM フィルタ設定アトムのデフォルト値・定数・歪みカーブ生成を検証する。
 */
import { describe, expect, it } from "vitest";
import { AM_FILTER_FREQ, AM_HPF_FREQ, makeDistortionCurve } from "./amFilter";

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

describe("makeDistortionCurve", () => {
	it("指定サンプル数の Float32Array を返す", () => {
		const curve = makeDistortionCurve(2, 1024);
		expect(curve).toBeInstanceOf(Float32Array);
		expect(curve.length).toBe(1024);
	});

	it("デフォルトサンプル数は 8192", () => {
		const curve = makeDistortionCurve(1.5);
		expect(curve.length).toBe(8192);
	});

	it("カーブの値は -1.0 〜 +1.0 の範囲内", () => {
		const curve = makeDistortionCurve(3, 4096);
		for (let i = 0; i < curve.length; i++) {
			expect(curve[i]).toBeGreaterThanOrEqual(-1);
			expect(curve[i]).toBeLessThanOrEqual(1);
		}
	});

	it("先頭は負、末尾は正（単調増加的）", () => {
		const curve = makeDistortionCurve(2, 256);
		expect(curve[0]).toBeLessThan(0);
		expect(curve[curve.length - 1]).toBeGreaterThan(0);
	});

	it("中央値は 0 に近い（奇関数性）", () => {
		const samples = 8193; // 奇数で中央が正確に 0
		const curve = makeDistortionCurve(2, samples);
		const mid = Math.floor(samples / 2);
		expect(Math.abs(curve[mid])).toBeLessThan(0.001);
	});

	it("amount=1 はほぼリニア（tanh(x)≈x for small x）", () => {
		const curve = makeDistortionCurve(1, 1024);
		// x=0.5 → tanh(0.5) ≈ 0.4621
		const idx = Math.floor(((0.5 + 1) / 2) * (1024 - 1));
		expect(curve[idx]).toBeCloseTo(Math.tanh(0.5), 2);
	});

	it("amount が大きいほどサチュレーションが強い", () => {
		const curveLow = makeDistortionCurve(1, 512);
		const curveHigh = makeDistortionCurve(5, 512);
		// x=0.5 のインデックス
		const idx = Math.floor(((0.5 + 1) / 2) * (512 - 1));
		// amount が大きい方が 1.0 に近い（サチュレーション）
		expect(curveHigh[idx]).toBeGreaterThan(curveLow[idx]);
	});
});
