/**
 * ステップモード用アナライザー
 *
 * 一定間隔(interval ms)ごとに周波数 value をサンプリングし、
 * 前半(interval×25%)で現在の表示値からサンプル値に上昇、
 * 後半(interval×75%)は設定可能な一定速度(fallSpeed)で下降する。
 *
 * peak は audioMotion の値をそのまま利用（毎フレーム getBars() から取得）。
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

	/** 下降速度 (レベル/秒)。1.0 = フルスケールから 1 秒で 0 に到達 */
	fallSpeed: number;

	/** 各バンドのサンプル時点の目標 value */
	private targetValues: [number, number][] = [];

	/** サンプル取得時点での表示中の value（上昇開始点）*/
	private riseStartValues: [number, number][] = [];

	/** 最後にサンプルを取得した時刻 (ms) */
	private sampleTime = 0;

	constructor(interval = 200, fallSpeed = 2.0) {
		this.interval = interval;
		this.fallSpeed = fallSpeed;
	}

	/**
	 * 毎フレーム呼び出す。
	 * value は interval ごとのサンプルを補間、peak は毎フレーム最新値を使用。
	 *
	 * @param getBars - audioMotionAnalyzer.getBars() を返す関数
	 * @param now  - performance.now() のタイムスタンプ
	 */
	update(
		getBars: () => AnalyzerBarData[],
		now: number,
	): AnalyzerBarData[] | null {
		// 毎フレーム getBars() を呼んで最新の peak / テンプレートを取得
		const currentBars = getBars();
		if (currentBars.length === 0) return null;

		const elapsed = now - this.sampleTime;

		// 新しいサンプルを取得するタイミング（value のみサンプル）
		if (elapsed >= this.interval || this.targetValues.length === 0) {
			// 現在の表示値を上昇開始点として保存
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

		// value は補間済み、peak / hold は audioMotion のリアルタイム値をそのまま使用
		return currentBars.map((bar, i) => ({
			...bar,
			value: currentValues[i] ?? bar.value,
		}));
	}

	/** 現在の progress に応じた補間 value を計算 */
	private computeCurrentValues(now: number): [number, number][] {
		const elapsed = now - this.sampleTime;
		const riseDuration = this.interval * 0.25;

		return this.targetValues.map((target, i) => {
			const start = this.riseStartValues[i] ?? ([0, 0] as [number, number]);

			if (elapsed <= riseDuration) {
				// 上昇フェーズ (25%): start → target (線形補間)
				const t = Math.min(elapsed / riseDuration, 1);
				return lerpPair(start, target, t);
			}
			// 下降フェーズ (75%): target から一定速度で減衰
			const fallElapsed = (elapsed - riseDuration) / 1000; // 秒に変換
			return [
				Math.max(0, target[0] - this.fallSpeed * fallElapsed),
				Math.max(0, target[1] - this.fallSpeed * fallElapsed),
			] as [number, number];
		});
	}
}
