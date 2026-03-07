/**
 * ステップモードのバー処理を共通化するフック。
 * 返り値の processBars(getBars) を useFrame / useTick 内で呼び出す。
 * animationMode が "realtime" なら getBars() をそのまま返す。
 */
import {
	animationModeAtom,
	steppedFallSpeedAtom,
	steppedIntervalAtom,
	steppedPeakFallSpeedAtom,
	steppedPeakHoldTimeAtom,
} from "@/atoms/visualizerAnimation";
import { SteppedAnalyzer } from "@/lib/steppedAnalyzer";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useRef } from "react";

export function useSteppedBars(): (
	getBars: () => AnalyzerBarData[],
) => AnalyzerBarData[] | null {
	const animationMode = useAtomValue(animationModeAtom);
	const steppedInterval = useAtomValue(steppedIntervalAtom);
	const steppedFallSpeed = useAtomValue(steppedFallSpeedAtom);
	const steppedPeakHoldTime = useAtomValue(steppedPeakHoldTimeAtom);
	const steppedPeakFallSpeed = useAtomValue(steppedPeakFallSpeedAtom);
	const steppedRef = useRef<SteppedAnalyzer | null>(null);

	function processBars(
		getBars: () => AnalyzerBarData[],
	): AnalyzerBarData[] | null {
		if (animationMode === "stepped") {
			if (!steppedRef.current) {
				steppedRef.current = new SteppedAnalyzer(
					steppedInterval,
					1.0,
					500,
					0.3,
				);
			}
			steppedRef.current.interval = steppedInterval;
			steppedRef.current.fallSpeed = steppedFallSpeed;
			steppedRef.current.peakHoldTime = steppedPeakHoldTime;
			steppedRef.current.peakFallSpeed = steppedPeakFallSpeed;
			return steppedRef.current.update(getBars, performance.now());
		}
		steppedRef.current = null;
		return getBars();
	}

	return processBars;
}
