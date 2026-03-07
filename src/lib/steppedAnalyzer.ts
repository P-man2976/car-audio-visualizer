/**
 * ステップモード用アナライザー
 *
 * 一定間隔(interval ms)ごとに周波数 value をサンプリングし、
 * 前半(interval×25%)で現在の表示値からサンプル値に上昇、
 * 後半(interval×75%)は設定可能な一定速度(fallSpeed)で下降する。
 *
 * peak は独自に計算: 補間済み value の最大値を追跡し、
 * ホールド後 peakFallSpeed で下降する。
 */
import type { AnalyzerBarData } from "audiomotion-analyzer";

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function lerpPair(
	a: [number, number],
	b: [number, number],
	t: number,
): [number, number] {
	return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

export class SteppedAnalyzer {
	/** サンプリング間隔 (ms) */
	interval: number;

	/** バーの下降速度 (レベル/秒) */
	fallSpeed: number;

	/** ピークのホールド時間 (ms) */
	peakHoldTime: number;

	/** ピークの下降速度 (レベル/秒) */
	peakFallSpeed: number;

	/** 各バンドのサンプル時点の目標 value */
	private targetValues: [number, number][] = [];

	/** サンプル取得時点での表示中の value（上昇開始点）*/
	private riseStartValues: [number, number][] = [];

	/** 最後にサンプルを取得した時刻 (ms) */
	private sampleTime = 0;

	/** 各バンドの現在のピーク値 */
	private peakLevels: [number, number][] = [];

	/** 各バンドのピークが設定された時刻 (ms) */
	private peakSetTimes: number[] = [];

	constructor(
		interval = 200,
		fallSpeed = 2.0,
		peakHoldTime = 500,
		peakFallSpeed = 1.0,
	) {
		this.interval = interval;
		this.fallSpeed = fallSpeed;
		this.peakHoldTime = peakHoldTime;
		this.peakFallSpeed = peakFallSpeed;
	}

	/**
	 * 毎フレーム呼び出す。
	 * value は interval ごとのサンプルを補間、peak は独自に計算。
	 */
	update(
		getBars: () => AnalyzerBarData[],
		now: number,
	): AnalyzerBarData[] | null {
		const currentBars = getBars();
		if (currentBars.length === 0) return null;

		const elapsed = now - this.sampleTime;

		// 新しいサンプルを取得するタイミング
		if (elapsed >= this.interval || this.targetValues.length === 0) {
			if (this.targetValues.length > 0) {
				this.riseStartValues = this.computeCurrentValues(now);
			} else {
				this.riseStartValues = currentBars.map(() => [0, 0]);
			}

			this.targetValues = currentBars.map(
				(b) => [...b.value] as [number, number],
			);

			this.sampleTime = now;
		}

		const currentValues = this.computeCurrentValues(now);

		// ピーク更新
		this.updatePeaks(currentValues, now);
		const currentPeaks = this.computeCurrentPeaks(now);

		return currentBars.map((bar, i) => ({
			...bar,
			value: currentValues[i] ?? bar.value,
			peak: currentPeaks[i] ?? bar.peak,
		}));
	}

	/** 補間済み value からピークを更新 */
	private updatePeaks(currentValues: [number, number][], now: number): void {
		// 初期化
		while (this.peakLevels.length < currentValues.length) {
			this.peakLevels.push([0, 0]);
			this.peakSetTimes.push(0);
		}

		for (let i = 0; i < currentValues.length; i++) {
			const [v0, v1] = currentValues[i];
			const [p0, p1] = this.peakLevels[i];

			// 現在の value がピークを超えたら更新
			if (v0 >= p0 || v1 >= p1) {
				this.peakLevels[i] = [Math.max(v0, p0), Math.max(v1, p1)];
				this.peakSetTimes[i] = now;
			}
		}
	}

	/** ホールド + 下降を考慮したピーク値を計算 */
	private computeCurrentPeaks(now: number): [number, number][] {
		return this.peakLevels.map((peak, i) => {
			const holdElapsed = now - this.peakSetTimes[i];
			if (holdElapsed <= this.peakHoldTime) {
				return peak;
			}
			const fallElapsed = (holdElapsed - this.peakHoldTime) / 1000;
			return [
				Math.max(0, peak[0] - this.peakFallSpeed * fallElapsed),
				Math.max(0, peak[1] - this.peakFallSpeed * fallElapsed),
			] as [number, number];
		});
	}

	/** 現在の progress に応じた補間 value を計算 */
	private computeCurrentValues(now: number): [number, number][] {
		const elapsed = now - this.sampleTime;
		const riseDuration = this.interval * 0.4;

		return this.targetValues.map((target, i) => {
			const start = this.riseStartValues[i] ?? ([0, 0] as [number, number]);

			if (elapsed <= riseDuration) {
				const t = Math.min(elapsed / riseDuration, 1);
				return lerpPair(start, target, t);
			}
			const fallElapsed = (elapsed - riseDuration) / 1000;
			return [
				Math.max(0, target[0] - this.fallSpeed * fallElapsed),
				Math.max(0, target[1] - this.fallSpeed * fallElapsed),
			] as [number, number];
		});
	}
}
