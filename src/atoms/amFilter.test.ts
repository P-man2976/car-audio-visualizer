/**
 * amFilter.ts / audio.ts のユニットテスト
 *
 * AM フィルタ設定アトムのデフォルト値・定数・設定・歪みカーブ生成を検証する。
 */
import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import {
	AM_FILTER_FREQ,
	AM_HPF_FREQ,
	amFilterSettingsAtom,
	calcMakeupGain,
	DEFAULT_AM_FILTER_SETTINGS,
	makeDistortionCurve,
} from "./amFilter";

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

describe("DEFAULT_AM_FILTER_SETTINGS", () => {
	it("LPF/HPF 周波数が可聴域内である", () => {
		expect(DEFAULT_AM_FILTER_SETTINGS.lpfFreq).toBeGreaterThanOrEqual(20);
		expect(DEFAULT_AM_FILTER_SETTINGS.lpfFreq).toBeLessThanOrEqual(20000);
		expect(DEFAULT_AM_FILTER_SETTINGS.hpfFreq).toBeGreaterThanOrEqual(10);
		expect(DEFAULT_AM_FILTER_SETTINGS.hpfFreq).toBeLessThanOrEqual(
			DEFAULT_AM_FILTER_SETTINGS.lpfFreq,
		);
	});

	it("歪み量が正の値である", () => {
		expect(DEFAULT_AM_FILTER_SETTINGS.distortionAmount).toBeGreaterThan(0);
	});

	it("コンプレッサー閾値が負の dB 値である", () => {
		expect(DEFAULT_AM_FILTER_SETTINGS.compThreshold).toBeLessThan(0);
	});

	it("コンプレッサーレシオが 1 以上である", () => {
		expect(DEFAULT_AM_FILTER_SETTINGS.compRatio).toBeGreaterThanOrEqual(1);
	});

	it("ノイズレベルが 0〜1 の範囲内である", () => {
		expect(DEFAULT_AM_FILTER_SETTINGS.noiseLevel).toBeGreaterThanOrEqual(0);
		expect(DEFAULT_AM_FILTER_SETTINGS.noiseLevel).toBeLessThanOrEqual(1);
	});

	it("スピーカー共振周波数が可聴域内である", () => {
		expect(
			DEFAULT_AM_FILTER_SETTINGS.speakerResonanceFreq,
		).toBeGreaterThanOrEqual(20);
		expect(DEFAULT_AM_FILTER_SETTINGS.speakerResonanceFreq).toBeLessThanOrEqual(
			20000,
		);
	});

	it("スピーカー共振ゲインが 0 以上である", () => {
		expect(
			DEFAULT_AM_FILTER_SETTINGS.speakerResonanceGain,
		).toBeGreaterThanOrEqual(0);
	});

	it("全プロパティが定義されている", () => {
		const keys: (keyof typeof DEFAULT_AM_FILTER_SETTINGS)[] = [
			"lpfFreq",
			"hpfFreq",
			"distortionAmount",
			"compThreshold",
			"compRatio",
			"noiseLevel",
			"speakerResonanceFreq",
			"speakerResonanceGain",
		];
		for (const key of keys) {
			expect(DEFAULT_AM_FILTER_SETTINGS).toHaveProperty(key);
			expect(typeof DEFAULT_AM_FILTER_SETTINGS[key]).toBe("number");
		}
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

	it("amount=1 のピーク正規化: x=0.5 → tanh(0.5)/tanh(1)", () => {
		const curve = makeDistortionCurve(1, 1024);
		const idx = Math.floor(((0.5 + 1) / 2) * (1024 - 1));
		expect(curve[idx]).toBeCloseTo(Math.tanh(0.5) / Math.tanh(1), 2);
	});

	it("ピーク正規化: 末尾が 1.0 に近い（amount によらず）", () => {
		for (const amount of [0.5, 1, 2.5, 5]) {
			const curve = makeDistortionCurve(amount, 512);
			expect(curve[curve.length - 1]).toBeCloseTo(1.0, 2);
		}
	});

	it("amount=0 は全サンプル 0（WaveShaper は curve=null でバイパスすべき）", () => {
		const curve = makeDistortionCurve(0, 64);
		for (let i = 0; i < curve.length; i++) {
			expect(Math.abs(curve[i])).toBe(0);
		}
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

describe("calcMakeupGain", () => {
	it("threshold=0 のとき 0dB を返す（バイパス）", () => {
		expect(calcMakeupGain(0, 8)).toBe(0);
	});

	it("ratio=1 のとき 0dB を返す（圧縮なし）", () => {
		expect(calcMakeupGain(-24, 1)).toBe(0);
	});

	it("ratio<1 のとき 0dB を返す（無効値ガード）", () => {
		expect(calcMakeupGain(-24, 0.5)).toBe(0);
	});

	it("threshold>0 のとき 0dB を返す（無効値ガード）", () => {
		expect(calcMakeupGain(6, 4)).toBe(0);
	});

	it("デフォルト設定 (threshold=-24, ratio=8) で正の補正ゲインを返す", () => {
		const gain = calcMakeupGain(-24, 8);
		expect(gain).toBeGreaterThan(0);
		// -(-24) * (1 - 1/8) * 0.5 = 24 * 0.875 * 0.5 = 10.5
		expect(gain).toBeCloseTo(10.5, 2);
	});

	it("閾値が低いほど補正ゲインが大きい", () => {
		const gain10 = calcMakeupGain(-10, 4);
		const gain30 = calcMakeupGain(-30, 4);
		expect(gain30).toBeGreaterThan(gain10);
	});

	it("レシオが高いほど補正ゲインが大きい", () => {
		const gain2 = calcMakeupGain(-20, 2);
		const gain10 = calcMakeupGain(-20, 10);
		expect(gain10).toBeGreaterThan(gain2);
	});
});

describe("amFilterSettingsAtom", () => {
	it("デフォルト値が DEFAULT_AM_FILTER_SETTINGS と一致する", () => {
		const store = createStore();
		const settings = store.get(amFilterSettingsAtom);
		expect(settings).toEqual(DEFAULT_AM_FILTER_SETTINGS);
	});

	it("直接値で set した値が read で反映される", () => {
		const store = createStore();
		const updated = { ...DEFAULT_AM_FILTER_SETTINGS, hpfFreq: 999 };
		store.set(amFilterSettingsAtom, updated);
		expect(store.get(amFilterSettingsAtom).hpfFreq).toBe(999);
	});

	it("updater 関数で set した値が read で反映される", () => {
		const store = createStore();
		store.set(amFilterSettingsAtom, (prev) => ({
			...prev,
			noiseLevel: 0.1,
		}));
		expect(store.get(amFilterSettingsAtom).noiseLevel).toBe(0.1);
		// 他のフィールドはデフォルトのまま
		expect(store.get(amFilterSettingsAtom).hpfFreq).toBe(
			DEFAULT_AM_FILTER_SETTINGS.hpfFreq,
		);
	});
});
