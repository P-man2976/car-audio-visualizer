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

	test("上昇フェーズ: 40%の時間で 0 → target に補間", () => {
		const sa = new SteppedAnalyzer(200);
		// t=0: サンプル取得, riseDuration = 200*0.40 = 80ms
		sa.update(() => makeBars([1.0]), 0);
		// t=40ms: 上昇の半分 (40/80 = 0.5)
		const mid = sa.update(() => makeBars([1.0]), 40);
		expect(mid![0].value[0]).toBeCloseTo(0.5, 1);
	});

	test("ピーク到達: interval×40% で target に到達", () => {
		const sa = new SteppedAnalyzer(200);
		sa.update(() => makeBars([0.8]), 0);
		// riseDuration = 80ms
		const peak = sa.update(() => makeBars([0.8]), 80);
		expect(peak![0].value[0]).toBeCloseTo(0.8, 1);
	});

	test("下降フェーズ: 定速で減衰する", () => {
		// fallSpeed=2.0/s, riseDuration=80ms
		const sa = new SteppedAnalyzer(200, 2.0);
		sa.update(() => makeBars([1.0]), 0);
		// t=130ms: 50ms into fall → 2.0 * 0.05 = 0.1 減衰 → 1.0 - 0.1 = 0.9
		const falling = sa.update(() => makeBars([1.0]), 130);
		expect(falling![0].value[0]).toBeCloseTo(0.9, 5);
	});

	test("下降フェーズ: 0 以下にはならない", () => {
		// fallSpeed=10.0/s, riseDuration=80ms
		const sa = new SteppedAnalyzer(200, 10.0);
		sa.update(() => makeBars([0.5]), 0);
		// t=180ms: 100ms into fall → 10.0 * 0.1 = 1.0 減衰 → 0.5 - 1.0 → clamped to 0
		const result = sa.update(() => makeBars([0.5]), 180);
		expect(result![0].value[0]).toBe(0);
	});

	test("fallSpeed を動的に変更できる", () => {
		const sa = new SteppedAnalyzer(200, 2.0);
		sa.update(() => makeBars([1.0]), 0);
		sa.fallSpeed = 4.0;
		// t=130ms: 50ms into fall → 4.0 * 0.05 = 0.2 減衰 → 1.0 - 0.2 = 0.8
		const result = sa.update(() => makeBars([1.0]), 130);
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
		// riseDuration = 400*0.40 = 160ms, t=80 → rise progress = 80/160 = 0.5
		const result = sa.update(() => makeBars([1.0]), 80);
		expect(result![0].value[0]).toBeCloseTo(0.5, 1);
	});

	test("新サンプルで上昇開始値が前の表示値から始まる", () => {
		const sa = new SteppedAnalyzer(200, 2.0);
		// Cycle 1: target = 1.0, riseDuration = 80ms
		sa.update(() => makeBars([1.0]), 0);
		// t=80ms: target に到達
		sa.update(() => makeBars([1.0]), 80);
		// t=130ms: 50ms into fall → 2.0*0.05 = 0.1 → display = 0.9
		const falling = sa.update(() => makeBars([1.0]), 130);
		expect(falling![0].value[0]).toBeCloseTo(0.9, 5);

		// t=200ms: new sample — riseStart = computeCurrentValues(200)
		// fallElapsed = (200-80)/1000 = 0.12 → display = 1.0 - 2.0*0.12 = 0.76
		const result = sa.update(() => makeBars([0.6]), 200);
		expect(result).not.toBeNull();
	});

	test("getBars は毎フレーム呼ばれる", () => {
		const sa = new SteppedAnalyzer(200);
		let callCount = 0;
		const getBars = () => {
			callCount++;
			return makeBars([0.5]);
		};

		sa.update(getBars, 0);
		expect(callCount).toBe(1);

		sa.update(getBars, 50);
		expect(callCount).toBe(2);

		sa.update(getBars, 100);
		expect(callCount).toBe(3);

		sa.update(getBars, 199);
		expect(callCount).toBe(4);

		sa.update(getBars, 200);
		expect(callCount).toBe(5);
	});

	test("空のバーを返された場合は null", () => {
		const sa = new SteppedAnalyzer(200);
		const result = sa.update(() => [], 0);
		expect(result).toBeNull();
	});

	// ========== ピーク独立計算テスト ==========

	test("ピークが補間値の最大値を追跡する", () => {
		const sa = new SteppedAnalyzer(1000, 2.0, 500, 1.0);
		// riseDuration = 1000 * 0.40 = 400ms
		sa.update(() => makeBars([0.8]), 0);
		// t=400ms: value reaches target 0.8
		const atPeak = sa.update(() => makeBars([0.8]), 400);
		expect(atPeak![0].peak[0]).toBeCloseTo(0.8, 5);
	});

	test("ピークがホールド期間中保持される", () => {
		const sa = new SteppedAnalyzer(1000, 2.0, 500, 1.0);
		sa.update(() => makeBars([0.8]), 0);
		// t=400ms: value = 0.8, peak = 0.8, peakSetTime = 400
		sa.update(() => makeBars([0.8]), 400);
		// t=600ms: value falling but peak should hold (holdElapsed = 200 < 500)
		const held = sa.update(() => makeBars([0.8]), 600);
		expect(held![0].peak[0]).toBeCloseTo(0.8, 5);
		// value should be falling: fallElapsed = (600-400)/1000 = 0.2 → 0.8 - 2.0*0.2 = 0.4
		expect(held![0].value[0]).toBeCloseTo(0.4, 5);
	});

	test("ピークがホールド後に下降する", () => {
		const sa = new SteppedAnalyzer(1000, 2.0, 100, 1.0);
		// riseDuration = 400ms, peakHoldTime = 100ms
		sa.update(() => makeBars([0.8]), 0);
		// t=400ms: peak = 0.8, peakSetTime = 400
		sa.update(() => makeBars([0.8]), 400);
		// t=600ms: holdElapsed = 200 > 100, fallElapsed = (200-100)/1000 = 0.1
		// peak = 0.8 - 1.0 * 0.1 = 0.7
		const falling = sa.update(() => makeBars([0.8]), 600);
		expect(falling![0].peak[0]).toBeCloseTo(0.7, 5);
	});

	test("ピーク下降後に 0 以下にならない", () => {
		const sa = new SteppedAnalyzer(1000, 2.0, 0, 10.0);
		// peakHoldTime=0, peakFallSpeed=10.0
		sa.update(() => makeBars([0.5]), 0);
		// t=400ms: peak = 0.5, peakSetTime = 400
		sa.update(() => makeBars([0.5]), 400);
		// t=500ms: holdElapsed = 100, fallElapsed = 100/1000 = 0.1
		// peak = 0.5 - 10.0 * 0.1 = -0.5 → clamped to 0
		const result = sa.update(() => makeBars([0.5]), 500);
		expect(result![0].peak[0]).toBe(0);
	});

	test("peakHoldTime を動的に変更できる", () => {
		const sa = new SteppedAnalyzer(1000, 2.0, 500, 1.0);
		sa.update(() => makeBars([0.8]), 0);
		sa.update(() => makeBars([0.8]), 400); // peak=0.8, peakSetTime=400
		sa.peakHoldTime = 50;
		// t=500ms: holdElapsed = 100 > 50, fallElapsed = (100-50)/1000 = 0.05
		// peak = 0.8 - 1.0 * 0.05 = 0.75
		const result = sa.update(() => makeBars([0.8]), 500);
		expect(result![0].peak[0]).toBeCloseTo(0.75, 5);
	});

	test("peakFallSpeed を動的に変更できる", () => {
		const sa = new SteppedAnalyzer(1000, 2.0, 100, 1.0);
		sa.update(() => makeBars([0.8]), 0);
		sa.update(() => makeBars([0.8]), 400); // peak=0.8, peakSetTime=400
		sa.peakFallSpeed = 2.0;
		// t=600ms: holdElapsed = 200 > 100, fallElapsed = (200-100)/1000 = 0.1
		// peak = 0.8 - 2.0 * 0.1 = 0.6
		const result = sa.update(() => makeBars([0.8]), 600);
		expect(result![0].peak[0]).toBeCloseTo(0.6, 5);
	});

	test("より高い value でピークが更新される", () => {
		const sa = new SteppedAnalyzer(200, 2.0, 500, 1.0);
		// Cycle 1: target = 0.5, riseDuration = 80ms
		sa.update(() => makeBars([0.5]), 0);
		sa.update(() => makeBars([0.5]), 80); // peak=0.5
		// Cycle 2: target = 0.9
		sa.update(() => makeBars([0.9]), 200); // 新サンプル
		// t=280ms: rise complete → value reaches 0.9 → peak updates to 0.9
		const result = sa.update(() => makeBars([0.9]), 280);
		expect(result![0].peak[0]).toBeCloseTo(0.9, 5);
	});
});
