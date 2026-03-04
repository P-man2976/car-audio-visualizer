/**
 * audioMotion.ts のユニットテスト
 *
 * audioMotionSettingsAtom のデフォルト値・定数・型が
 * audioMotionAnalyzer の仕様と一致することを検証する。
 */
import { describe, expect, it } from "vitest";
import {
	AUDIO_MOTION_MODE_LABELS,
	DEFAULT_AUDIO_MOTION_SETTINGS,
	FFT_SIZE_OPTIONS,
	WEIGHTING_FILTER_LABELS,
} from "./audioMotion";

describe("DEFAULT_AUDIO_MOTION_SETTINGS", () => {
	it("fftSize はデフォルト 8192 を持つ", () => {
		expect(DEFAULT_AUDIO_MOTION_SETTINGS.fftSize).toBe(8192);
	});

	it("minDecibels は maxDecibels より小さい", () => {
		expect(DEFAULT_AUDIO_MOTION_SETTINGS.minDecibels).toBeLessThan(
			DEFAULT_AUDIO_MOTION_SETTINGS.maxDecibels,
		);
	});

	it("minFreq は maxFreq より小さい", () => {
		expect(DEFAULT_AUDIO_MOTION_SETTINGS.minFreq).toBeLessThan(
			DEFAULT_AUDIO_MOTION_SETTINGS.maxFreq,
		);
	});

	it("smoothingTimeConstant は 0 以上 1 未満", () => {
		expect(
			DEFAULT_AUDIO_MOTION_SETTINGS.smoothingTimeConstant,
		).toBeGreaterThanOrEqual(0);
		expect(DEFAULT_AUDIO_MOTION_SETTINGS.smoothingTimeConstant).toBeLessThan(1);
	});

	it("peakFallSpeed は正の数", () => {
		expect(DEFAULT_AUDIO_MOTION_SETTINGS.peakFallSpeed).toBeGreaterThan(0);
	});

	it("mode は 0〜10 の整数", () => {
		expect(DEFAULT_AUDIO_MOTION_SETTINGS.mode).toBeGreaterThanOrEqual(0);
		expect(DEFAULT_AUDIO_MOTION_SETTINGS.mode).toBeLessThanOrEqual(10);
		expect(Number.isInteger(DEFAULT_AUDIO_MOTION_SETTINGS.mode)).toBe(true);
	});

	it("ansiBands はブール型", () => {
		expect(typeof DEFAULT_AUDIO_MOTION_SETTINGS.ansiBands).toBe("boolean");
	});

	it("weightingFilter は空文字または有効なフィルター名", () => {
		const valid = ["", "A", "B", "C", "D", "468"];
		expect(valid).toContain(DEFAULT_AUDIO_MOTION_SETTINGS.weightingFilter);
	});
});

describe("FFT_SIZE_OPTIONS", () => {
	it("すべて 2 の累乗である", () => {
		for (const size of FFT_SIZE_OPTIONS) {
			expect(size & (size - 1)).toBe(0);
		}
	});

	it("昇順にソートされている", () => {
		for (let i = 1; i < FFT_SIZE_OPTIONS.length; i++) {
			expect(FFT_SIZE_OPTIONS[i]).toBeGreaterThan(
				FFT_SIZE_OPTIONS[i - 1] as number,
			);
		}
	});

	it("デフォルトの fftSize が選択肢に含まれる", () => {
		expect(FFT_SIZE_OPTIONS).toContain(DEFAULT_AUDIO_MOTION_SETTINGS.fftSize);
	});
});

describe("AUDIO_MOTION_MODE_LABELS", () => {
	it("モード 0〜10 のラベルがすべて存在する", () => {
		for (let m = 0; m <= 10; m++) {
			expect(
				AUDIO_MOTION_MODE_LABELS[m as keyof typeof AUDIO_MOTION_MODE_LABELS],
			).toBeTruthy();
		}
	});

	it("各ラベルはモード番号を含む文字列である", () => {
		for (let m = 0; m <= 10; m++) {
			const label =
				AUDIO_MOTION_MODE_LABELS[m as keyof typeof AUDIO_MOTION_MODE_LABELS];
			expect(label).toContain(String(m));
		}
	});
});

describe("WEIGHTING_FILTER_LABELS", () => {
	const EXPECTED_KEYS = ["", "A", "B", "C", "D", "468"];

	it("すべての有効なフィルター名のラベルが存在する", () => {
		for (const key of EXPECTED_KEYS) {
			expect(
				WEIGHTING_FILTER_LABELS[key as keyof typeof WEIGHTING_FILTER_LABELS],
			).toBeTruthy();
		}
	});

	it("空文字（フラット）ラベルが存在する", () => {
		expect(WEIGHTING_FILTER_LABELS[""]).toBeDefined();
	});
});
