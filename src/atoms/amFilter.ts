/**
 * AM ラジオフィルタの有効/無効を永続化する Jotai atom と定数、
 * および歪みカーブ生成関数。
 *
 * AM 放送帯域（~30Hz〜4500Hz）を模したバンドパスフィルタ（HPF + LPF）、
 * ソフトクリッピング歪み、モノラル化、自動利得制御（コンプレッサー）の ON/OFF 設定。
 * 実際の AudioNode は audio.ts で管理し、本モジュールは
 * 設定アトム・定数・純粋関数のみを提供する。
 */
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

/**
 * ソフトクリッピング用の転送関数カーブを生成する。
 * tanh ベースのサチュレーションで AM ラジオ特有の倍音歪みを再現する。
 *
 * @param amount - 歪みの強さ（1.0 = ほぼリニア、大きいほど歪む）
 * @param samples - カーブの解像度（サンプル数）
 * @returns -1.0〜+1.0 の範囲のソフトクリッピングカーブ
 */
export function makeDistortionCurve(
	amount: number,
	samples = 8192,
): Float32Array {
	const curve = new Float32Array(samples);
	for (let i = 0; i < samples; i++) {
		const x = (2 * i) / (samples - 1) - 1; // -1.0 〜 +1.0
		curve[i] = Math.tanh(amount * x);
	}
	return curve;
}
