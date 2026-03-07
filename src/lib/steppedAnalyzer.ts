/**
 * ステップモード用アナライザー
 *
 * 一定間隔(interval ms)ごとに周波数データをサンプリングし、
 * 前半(interval/2)で現在の表示値からサンプル値に上昇、
 * 後半(interval/2)でサンプル値から 0 に向けて下降する補間を行う。
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

	/** 最新サンプルのバーデータ（テンプレート — freq, hold 等をコピーするため保持）*/
	private bars: AnalyzerBarData[] = [];

	/** 各バンドのサンプル時点の目標 value */
	private targetValues: [number, number][] = [];

	/** 各バンドのサンプル時点の目標 peak */
	private targetPeaks: [number, number][] = [];

	/** サンプル取得時点での表示中の value（上昇開始点）*/
	private riseStartValues: [number, number][] = [];

	/** サンプル取得時点での表示中の peak */
	private riseStartPeaks: [number, number][] = [];

	/** 最後にサンプルを取得した時刻 (ms) */
	private sampleTime = 0;

	constructor(interval = 200) {
		this.interval = interval;
	}

	/**
	 * 毎フレーム呼び出す。必要に応じて getBars() を呼び、補間済みデータを返す。
	 *
	 * @param getBars - audioMotionAnalyzer.getBars() を返す関数
	 * @param now  - performance.now() のタイムスタンプ
	 */
	update(
		getBars: () => AnalyzerBarData[],
		now: number,
	): AnalyzerBarData[] | null {
		const elapsed = now - this.sampleTime;

		// 新しいサンプルを取得するタイミング
		if (elapsed >= this.interval || this.bars.length === 0) {
			// 現在の表示値を上昇開始点として保存
			if (this.targetValues.length > 0) {
				this.riseStartValues = this.computeCurrentValues(now);
				this.riseStartPeaks = this.computeCurrentPeaks(now);
			}

			this.bars = getBars();
			this.targetValues = this.bars.map(
				(b) => [...b.value] as [number, number],
			);
			this.targetPeaks = this.bars.map((b) => [...b.peak] as [number, number]);

			// 初回はゼロからスタート
			if (this.riseStartValues.length === 0) {
				this.riseStartValues = this.bars.map(() => [0, 0]);
				this.riseStartPeaks = this.bars.map(() => [0, 0]);
			}

			this.sampleTime = now;
		}

		if (this.bars.length === 0) return null;

		const currentValues = this.computeCurrentValues(now);
		const currentPeaks = this.computeCurrentPeaks(now);

		return this.bars.map((bar, i) => ({
			...bar,
			value: currentValues[i],
			peak: currentPeaks[i],
		}));
	}

	/** 現在の progress に応じた補間 value を計算 */
	private computeCurrentValues(now: number): [number, number][] {
		const elapsed = now - this.sampleTime;
		const half = this.interval / 2;

		return this.targetValues.map((target, i) => {
			const start = this.riseStartValues[i] ?? ([0, 0] as [number, number]);

			if (elapsed <= half) {
				// 上昇フェーズ: start → target
				const t = Math.min(elapsed / half, 1);
				return lerpPair(start, target, t);
			}
			// 下降フェーズ: target → 0
			const t = Math.min((elapsed - half) / half, 1);
			return lerpPair(target, [0, 0], t);
		});
	}

	/** 現在の progress に応じた補間 peak を計算 */
	private computeCurrentPeaks(now: number): [number, number][] {
		const elapsed = now - this.sampleTime;
		const half = this.interval / 2;

		return this.targetPeaks.map((target, i) => {
			const start = this.riseStartPeaks[i] ?? ([0, 0] as [number, number]);

			if (elapsed <= half) {
				const t = Math.min(elapsed / half, 1);
				return lerpPair(start, target, t);
			}
			const t = Math.min((elapsed - half) / half, 1);
			return lerpPair(target, [0, 0], t);
		});
	}
}
