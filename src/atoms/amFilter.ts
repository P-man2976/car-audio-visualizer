/**
 * AM ラジオフィルタの有効/無効を永続化する Jotai atom と定数、
 * 設定パラメーター、および歪みカーブ生成関数。
 *
 * AM 放送帯域（~30Hz〜4500Hz）を模したバンドパスフィルタ（HPF + LPF）、
 * ソフトクリッピング歪み、モノラル化、自動利得制御（コンプレッサー）、
 * ブラウンノイズの ON/OFF 設定と各パラメーター。
 * 実際の AudioNode は audio.ts で管理し、本モジュールは
 * 設定アトム・定数・純粋関数のみを提供する。
 */
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/** AM フィルタの有効/無効設定（永続化）。デフォルト: 有効 */
export const amFilterEnabledAtom = atomWithStorage(
	"cav-am-filter-enabled",
	true,
);

/** AM ローパスフィルタのカットオフ周波数 [Hz] */
export const AM_FILTER_FREQ = 4500;

/** AM ハイパスフィルタのカットオフ周波数 [Hz] */
export const AM_HPF_FREQ = 30;

// ─── AM フィルタ設定 ──────────────────────────────────────────────────────────

/** AM フィルタの各ノードパラメーター */
export interface AmFilterSettings {
	/** LPF カットオフ周波数 [Hz] */
	lpfFreq: number;
	/** HPF カットオフ周波数 [Hz] */
	hpfFreq: number;
	/** 歪みの強さ (0 = なし、大きいほど歪む) */
	distortionAmount: number;
	/** コンプレッサー閾値 [dB] */
	compThreshold: number;
	/** コンプレッサーレシオ */
	compRatio: number;
	/** ブラウンノイズレベル (0 = なし、1 = 最大) */
	noiseLevel: number;
	/** スピーカー共振周波数 [Hz]。AM ラジオの小型スピーカーのピーキング EQ */
	speakerResonanceFreq: number;
	/** スピーカー共振ゲイン [dB]。0 = バイパス */
	speakerResonanceGain: number;
}

/** デフォルトの AM フィルタ設定 */
export const DEFAULT_AM_FILTER_SETTINGS: AmFilterSettings = {
	lpfFreq: 4000,
	hpfFreq: 100,
	distortionAmount: 0.5,
	compThreshold: -24,
	compRatio: 8,
	noiseLevel: 0.005,
	speakerResonanceFreq: 1200,
	speakerResonanceGain: 2,
};

/**
 * AM フィルタ設定の永続化用 raw atom。
 * 直接使わず、amFilterSettingsAtom を使用すること。
 */
const rawAmFilterSettingsAtom = atomWithStorage<Partial<AmFilterSettings>>(
	"cav-am-filter-settings",
	DEFAULT_AM_FILTER_SETTINGS,
);

/**
 * AM フィルタ設定アトム（永続化 + デフォルトマージ）。
 *
 * localStorage に旧形式（新フィールドが欠けた）値が保存されていても、
 * 読み取り時にデフォルト値で補完する。
 */
export const amFilterSettingsAtom = atom(
	(get): AmFilterSettings => ({
		...DEFAULT_AM_FILTER_SETTINGS,
		...get(rawAmFilterSettingsAtom),
	}),
	(
		_get,
		set,
		update: AmFilterSettings | ((prev: AmFilterSettings) => AmFilterSettings),
	) => {
		if (typeof update === "function") {
			const prev = {
				...DEFAULT_AM_FILTER_SETTINGS,
				..._get(rawAmFilterSettingsAtom),
			};
			set(rawAmFilterSettingsAtom, update(prev));
		} else {
			set(rawAmFilterSettingsAtom, update);
		}
	},
);

/**
 * コンプレッサーの閾値・レシオから静的メイクアップゲインを計算する。
 *
 * 閾値を下げるほど圧縮量が増えて出力レベルが下がるため、
 * その分を補正するゲイン (dB) を近似式で算出する。
 *
 * @param threshold - コンプレッサー閾値 [dB] (≤ 0)
 * @param ratio - コンプレッサーレシオ (≥ 1)
 * @returns メイクアップゲイン [dB] (≥ 0)
 */
export function calcMakeupGain(threshold: number, ratio: number): number {
	if (threshold >= 0 || ratio <= 1) return 0;
	return -threshold * (1 - 1 / ratio) * 0.5;
}

/**
 * ソフトクリッピング用の転送関数カーブを生成する。
 * tanh ベースのサチュレーションで AM ラジオ特有の倍音歪みを再現する。
 *
 * @param amount - 歪みの強さ（1.0 = ほぼリニア、大きいほど歪む）
 * @param samples - カーブの解像度（サンプル数）
 * @returns -1.0〜+1.0 の範囲のソフトクリッピングカーブ（ピーク正規化済み）
 */
export function makeDistortionCurve(
	amount: number,
	samples = 8192,
): Float32Array<ArrayBuffer> {
	const curve = new Float32Array(samples);
	// tanh(amount) で正規化し、amount を変えてもピークレベルを ±1.0 に保つ
	const norm = amount > 0 ? Math.tanh(amount) : 1;
	for (let i = 0; i < samples; i++) {
		const x = (2 * i) / (samples - 1) - 1; // -1.0 〜 +1.0
		curve[i] = Math.tanh(amount * x) / norm;
	}
	return curve;
}
