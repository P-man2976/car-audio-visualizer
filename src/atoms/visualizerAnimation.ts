import { atomWithStorage } from "jotai/utils";

export type AnimationMode = "realtime" | "stepped";

/** ビジュアライザーの動作モード: リアルタイム or ステップ */
export const animationModeAtom = atomWithStorage<AnimationMode>(
	"cav-animation-mode-v1",
	"realtime",
);

/** ステップモードのサンプリング間隔 (ms) */
export const steppedIntervalAtom = atomWithStorage<number>(
	"cav-stepped-interval-v1",
	200,
);

/** ステップモードの下降速度 (レベル/秒)。1.0 = フルスケールから 1 秒で 0 */
export const steppedFallSpeedAtom = atomWithStorage<number>(
	"cav-stepped-fall-speed-v1",
	2.0,
);

/** ステップモードのピークホールド時間 (ms) */
export const steppedPeakHoldTimeAtom = atomWithStorage<number>(
	"cav-stepped-peak-hold-v1",
	500,
);

/** ステップモードのピーク下降速度 (レベル/秒) */
export const steppedPeakFallSpeedAtom = atomWithStorage<number>(
	"cav-stepped-peak-fall-speed-v1",
	1.0,
);
