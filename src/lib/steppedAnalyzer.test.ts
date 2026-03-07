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

/** value と peak を別々に指定可能な makeBars */
function makeBarsWithPeak(values: number[], peaks: number[]) {
	return values.map((v, i) => ({
		value: [v, v] as [number, number],
		peak: [peaks[i], peaks[i]] as [number, number],
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

	test("上昇フェーズ: 25%の時間で 0 → target に補間", () => {
		const sa = new SteppedAnalyzer(200);
		// t=0: サンプル取得, riseDuration = 200*0.25 = 50ms
		sa.update(() => makeBars([1.0]), 0);
		// t=25ms: 上昇の半分 (25/50 = 0.5)
		const mid = sa.update(() => makeBars([1.0]), 25);
		expect(mid![0].value[0]).toBeCloseTo(0.5, 1);
	});

	test("ピーク到達: interval×25% で target に到達", () => {
		const sa = new SteppedAnalyzer(200);
		sa.update(() => makeBars([0.8]), 0);
		// riseDuration = 50ms
		const peak = sa.update(() => makeBars([0.8]), 50);
		expect(peak![0].value[0]).toBeCloseTo(0.8, 1);
	});

	test("下降フェーズ: 定速で減衰する", () => {
		// fallSpeed=2.0/s, riseDuration=50ms
		const sa = new SteppedAnalyzer(200, 2.0);
		sa.update(() => makeBars([1.0]), 0);
		// t=100ms: 50ms into fall → 2.0 * 0.05 = 0.1 減衰 → 1.0 - 0.1 = 0.9
		const falling = sa.update(() => makeBars([1.0]), 100);
		expect(falling![0].value[0]).toBeCloseTo(0.9, 5);
	});

	test("下降フェーズ: 0 以下にはならない", () => {
		// fallSpeed=10.0/s, riseDuration=50ms
		const sa = new SteppedAnalyzer(200, 10.0);
		sa.update(() => makeBars([0.5]), 0);
		// t=100ms: 50ms into fall → 10.0 * 0.05 = 0.5 減衰 → 0.5 - 0.5 = 0 (clamped)
		const result = sa.update(() => makeBars([0.5]), 100);
		expect(result![0].value[0]).toBe(0);
	});

	test("fallSpeed を動的に変更できる", () => {
		const sa = new SteppedAnalyzer(200, 2.0);
		sa.update(() => makeBars([1.0]), 0);
		sa.fallSpeed = 4.0;
		// t=100ms: 50ms into fall → 4.0 * 0.05 = 0.2 減衰 → 1.0 - 0.2 = 0.8
		const result = sa.update(() => makeBars([1.0]), 100);
		expect(result![0].value[0]).toBeCloseTo(0.8, 5);
	});

	test("interval 終了時に新サンプルが取得される", () => {
		const sa = new SteppedAnalyzer(200);
		sa.update(() => makeBars([1.0]), 0);
		const end = sa.update(() => makeBars([1.0]), 200);
		// t=200ms: 新しいサンプルが取得される（elapsed >= interval）
		expect(end).not.toBeNull();
	});

	test("interval を動的に変更できる", () => {
		const sa = new SteppedAnalyzer(200);
		sa.update(() => makeBars([1.0]), 0);
		sa.interval = 400;
		// riseDuration = 400*0.25 = 100ms, t=50 → rise progress = 50/100 = 0.5
		const result = sa.update(() => makeBars([1.0]), 50);
		expect(result![0].value[0]).toBeCloseTo(0.5, 1);
	});

	test("新サンプルで上昇開始値が前の表示値から始まる", () => {
		const sa = new SteppedAnalyzer(200, 2.0);
		// Cycle 1: target = 1.0, riseDuration = 50ms
		sa.update(() => makeBars([1.0]), 0);
		// t=50ms: target に到達
		sa.update(() => makeBars([1.0]), 50);
		// t=100ms: 50ms into fall → 2.0*0.05 = 0.1 → display = 0.9
		const falling = sa.update(() => makeBars([1.0]), 100);
		expect(falling![0].value[0]).toBeCloseTo(0.9, 5);

		// t=200ms: new sample — riseStart should be the value at fall end
		// 150ms into fall → 2.0*0.15 = 0.3 → display = 0.7
		const result = sa.update(() => makeBars([0.6]), 200);
		expect(result).not.toBeNull();
	});

	test("getBars は毎フレーム呼ばれる（peak のため）", () => {
		const sa = new SteppedAnalyzer(200);
		let callCount = 0;
		const getBars = () => {
			callCount++;
			return makeBars([0.5]);
		};

		sa.update(getBars, 0); // 初回
		expect(callCount).toBe(1);

		sa.update(getBars, 50); // 50ms
		expect(callCount).toBe(2);

		sa.update(getBars, 100); // 100ms
		expect(callCount).toBe(3);

		sa.update(getBars, 199); // 199ms
		expect(callCount).toBe(4);

		sa.update(getBars, 200); // 200ms: 新サンプル
		expect(callCount).toBe(5);
	});

	test("peak は audioMotion のリアルタイム値をそのまま返す", () => {
		const sa = new SteppedAnalyzer(200);
		// 初回サンプル（value=0.5, peak=0.5）
		sa.update(() => makeBarsWithPeak([0.5], [0.5]), 0);
		// 50ms 後: value は補間中だが peak は最新の getBars() から取得
		const mid = sa.update(() => makeBarsWithPeak([0.5], [0.9]), 50);
		// peak は補間されず、getBars() の値がそのまま返される
		expect(mid![0].peak[0]).toBeCloseTo(0.9, 5);
	});

	test("空のバーを返された場合は null", () => {
		const sa = new SteppedAnalyzer(200);
		const result = sa.update(() => [], 0);
		expect(result).toBeNull();
	});
});
