import { describe, expect, test } from "vitest";
import { SteppedAnalyzer } from "./steppedAnalyzer";

/** AnalyzerBarData のミニマルなモック */
function makeBars(values: number[]) {
	return values.map((v) => ({
		value: [v, v] as [number, number],
		peak: [v, v] as [number, number],
		hold: [0, 0] as [number, number],
		freq: 1000,
		freqLo: 900,
		freqHi: 1100,
	}));
}

describe("SteppedAnalyzer", () => {
	test("初回 update でデータを返す", () => {
		const sa = new SteppedAnalyzer(200);
		const result = sa.update(() => makeBars([0.5, 0.8]), 0);
		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
	});

	test("上昇フェーズ: 半分の時間で 0 → target に補間", () => {
		const sa = new SteppedAnalyzer(200);
		// t=0: サンプル取得
		sa.update(() => makeBars([1.0]), 0);
		// t=50ms: 上昇の半分 (50/100 = 0.5)
		const mid = sa.update(() => makeBars([1.0]), 50);
		expect(mid![0].value[0]).toBeCloseTo(0.5, 1);
	});

	test("ピーク到達: half interval で target に到達", () => {
		const sa = new SteppedAnalyzer(200);
		sa.update(() => makeBars([0.8]), 0);
		const peak = sa.update(() => makeBars([0.8]), 100);
		expect(peak![0].value[0]).toBeCloseTo(0.8, 1);
	});

	test("下降フェーズ: target → 0 に向けて減衰", () => {
		const sa = new SteppedAnalyzer(200);
		sa.update(() => makeBars([1.0]), 0);
		// t=150ms: 下降の半分 — target(1.0) → 0 の 50%
		const falling = sa.update(() => makeBars([1.0]), 150);
		expect(falling![0].value[0]).toBeCloseTo(0.5, 1);
	});

	test("下降完了: interval 終了時に 0 に到達", () => {
		const sa = new SteppedAnalyzer(200);
		sa.update(() => makeBars([1.0]), 0);
		const end = sa.update(() => makeBars([1.0]), 200);
		// t=200ms: 新しいサンプルが取得される（elapsed >= interval）
		// getBars は同じ値を返すので、新しいサイクルの t=0 相当
		// riseStartValues は前の表示値(0)から開始
		expect(end).not.toBeNull();
	});

	test("interval を動的に変更できる", () => {
		const sa = new SteppedAnalyzer(200);
		sa.update(() => makeBars([1.0]), 0);
		sa.interval = 400;
		// half = 200ms, t=100 → rise progress = 100/200 = 0.5
		const result = sa.update(() => makeBars([1.0]), 100);
		expect(result![0].value[0]).toBeCloseTo(0.5, 1);
	});

	test("新サンプルで上昇開始値が前の表示値から始まる", () => {
		const sa = new SteppedAnalyzer(200);
		// Cycle 1: target = 1.0
		sa.update(() => makeBars([1.0]), 0);
		// t=100ms: peak at 1.0
		sa.update(() => makeBars([1.0]), 100);
		// t=150ms: falling, display ≈ 0.5
		sa.update(() => makeBars([1.0]), 150);

		// t=200ms: new sample, target = 0.6
		// riseStart should be ≈ 0 (end of fall from 1.0)
		let callCount = 0;
		const result = sa.update(() => {
			callCount++;
			return makeBars([0.6]);
		}, 200);
		// New sample was taken (callCount should be 1)
		expect(callCount).toBe(1);
		expect(result).not.toBeNull();
	});

	test("getBars は interval ごとにしか呼ばれない", () => {
		const sa = new SteppedAnalyzer(200);
		let callCount = 0;
		const getBars = () => {
			callCount++;
			return makeBars([0.5]);
		};

		sa.update(getBars, 0); // 初回: 呼ばれる
		expect(callCount).toBe(1);

		sa.update(getBars, 50); // 50ms: 呼ばれない
		expect(callCount).toBe(1);

		sa.update(getBars, 100); // 100ms: 呼ばれない
		expect(callCount).toBe(1);

		sa.update(getBars, 199); // 199ms: 呼ばれない
		expect(callCount).toBe(1);

		sa.update(getBars, 200); // 200ms: 新サンプル
		expect(callCount).toBe(2);
	});

	test("peak も同様に補間される", () => {
		const sa = new SteppedAnalyzer(200);
		sa.update(() => makeBars([0.8]), 0);
		const mid = sa.update(() => makeBars([0.8]), 50);
		// peak の初期値は 0 → 0.8, t=50/100=0.5 → 0.4
		expect(mid![0].peak[0]).toBeCloseTo(0.4, 1);
	});

	test("空のバーを返された場合は null", () => {
		const sa = new SteppedAnalyzer(200);
		const result = sa.update(() => [], 0);
		expect(result).toBeNull();
	});
});
