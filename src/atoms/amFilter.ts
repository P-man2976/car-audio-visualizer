/**
 * AM ラジオフィルタの有効/無効を永続化する Jotai atom。
 *
 * AM 放送帯域（~4500Hz）を模したローパスフィルタの ON/OFF 設定。
 * 実際の BiquadFilterNode は audio.ts で管理し、本モジュールは
 * 設定アトムと定数のみを提供する。
 */
import { atomWithStorage } from "jotai/utils";

/** AM フィルタの有効/無効設定（永続化）。デフォルト: 有効 */
export const amFilterEnabledAtom = atomWithStorage(
	"cav-am-filter-enabled",
	true,
);

/** AM ローパスフィルタのカットオフ周波数 [Hz] */
export const AM_FILTER_FREQ = 4500;
