/**
 * audioMotionAnalyzer に audioMotionSettingsAtom の設定を適用するフック。
 *
 * アトムの値が変化するたびに analyzer.setOptions() を呼び出す。
 * HomePage など、アプリのルート近くで一度だけ使用すること。
 */
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { audioMotionSettingsAtom } from "@/atoms/audioMotion";

export function useAudioMotionSettings(): void {
	const analyzer = useAtomValue(audioMotionAnalyzerAtom);
	const settings = useAtomValue(audioMotionSettingsAtom);

	useEffect(() => {
		analyzer.setOptions({
			fftSize: settings.fftSize,
			minDecibels: settings.minDecibels,
			maxDecibels: settings.maxDecibels,
			minFreq: settings.minFreq,
			maxFreq: settings.maxFreq,
			mode: settings.mode,
			weightingFilter: settings.weightingFilter,
			peakFallSpeed: settings.peakFallSpeed,
			smoothingTimeConstant: settings.smoothingTimeConstant,
			ansiBands: settings.ansiBands,
		});
	}, [
		analyzer,
		settings.fftSize,
		settings.minDecibels,
		settings.maxDecibels,
		settings.minFreq,
		settings.maxFreq,
		settings.mode,
		settings.weightingFilter,
		settings.peakFallSpeed,
		settings.smoothingTimeConstant,
		settings.ansiBands,
	]);
}
