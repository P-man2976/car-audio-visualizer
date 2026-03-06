/**
 * audioMotionAnalyzer の動的オプションを永続化する Jotai atom。
 *
 * 各プロパティは setOptions() で AudioMotionAnalyzer に適用される。
 * storage キー: "cav-audiomotion-settings-v1"
 */

import type { WeightingFilter } from "audiomotion-analyzer";
import { atomWithStorage } from "jotai/utils";

export type { WeightingFilter };

/** FFT サイズ（2の累乗のみ有効） */
export type FftSize = 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768;

/**
 * audiomotion-analyzer の解析モード
 *
 * 0  : 周波数バー（連続）
 * 1  : 1/24 オクターブバンド
 * 2  : 1/12 オクターブバンド
 * 3  : 1/8  オクターブバンド
 * 4  : 1/6  オクターブバンド
 * 5  : 1/4  オクターブバンド
 * 6  : 1/3  オクターブバンド（ANSI）  ← デフォルト
 * 7  : 1/2  オクターブバンド
 * 8  : 1    オクターブバンド
 * 9  : レベルメーター（ch 合算）
 * 10 : レベルメーター（L/R 分離）
 */
export type AudioMotionMode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface AudioMotionSettings {
	/** FFT サイズ。大きいほど周波数解像度が上がるが CPU 負荷も増加する */
	fftSize: FftSize;
	/** 解析の最小デシベル値（下限ノイズフロア）。例: -90 〜 -30 */
	minDecibels: number;
	/** 解析の最大デシベル値（上限クリッピング）。例: -30 〜 0 */
	maxDecibels: number;
	/** 表示する最小周波数 [Hz] */
	minFreq: number;
	/** 表示する最大周波数 [Hz] */
	maxFreq: number;
	/** 解析モード（バンド分割の粒度） */
	mode: AudioMotionMode;
	/** 周波数重み付けフィルター */
	weightingFilter: WeightingFilter;
	/** ピーク指示器の落下速度（0.001 〜 0.1 が目安） */
	peakFallSpeed: number;
	/** スムージングタイムコンスタント（0 = オフ、1 = 最大スムージング） */
	smoothingTimeConstant: number;
	/** ANSI 標準バンドを使用する（mode 6〜8 で有効） */
	ansiBands: boolean;
}

export const DEFAULT_AUDIO_MOTION_SETTINGS: AudioMotionSettings = {
	fftSize: 8192,
	minDecibels: -70,
	maxDecibels: -20,
	minFreq: 20,
	maxFreq: 22000,
	mode: 6,
	weightingFilter: "A",
	peakFallSpeed: 0.005,
	smoothingTimeConstant: 0.5,
	ansiBands: true,
};

export const AUDIO_MOTION_MODE_LABELS: Record<AudioMotionMode, string> = {
	0: "0 – 周波数バー（連続）",
	1: "1 – 1/24 オクターブバンド",
	2: "2 – 1/12 オクターブバンド",
	3: "3 – 1/8 オクターブバンド",
	4: "4 – 1/6 オクターブバンド",
	5: "5 – 1/4 オクターブバンド",
	6: "6 – 1/3 オクターブバンド（ANSI）",
	7: "7 – 1/2 オクターブバンド",
	8: "8 – 1 オクターブバンド",
	9: "9 – レベルメーター（合算）",
	10: "10 – レベルメーター（L/R）",
};

export const WEIGHTING_FILTER_LABELS: Record<WeightingFilter, string> = {
	"": "なし（フラット）",
	A: "A 特性（人間の聴覚特性に近い）",
	B: "B 特性",
	C: "C 特性（高レベル音向け）",
	D: "D 特性（航空騒音測定向け）",
	"468": "ITU-R 468（放送・録音向け）",
};

export const FFT_SIZE_OPTIONS: FftSize[] = [
	512, 1024, 2048, 4096, 8192, 16384, 32768,
];

export const audioMotionSettingsAtom = atomWithStorage<AudioMotionSettings>(
	"cav-audiomotion-settings-v1",
	DEFAULT_AUDIO_MOTION_SETTINGS,
);
