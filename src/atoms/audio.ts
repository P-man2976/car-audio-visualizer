import AudioMotionAnalyzer from "audiomotion-analyzer";
import { atom } from "jotai";

const sharedAudioElement = new Audio();
sharedAudioElement.crossOrigin = "anonymous";

let analyzerInstance: AudioMotionAnalyzer | null = null;

function getAnalyzer() {
	if (analyzerInstance) {
		return analyzerInstance;
	}

	analyzerInstance = new AudioMotionAnalyzer(undefined, {
		useCanvas: false,
		source: sharedAudioElement,
		minDecibels: -70,
		maxDecibels: -20,
		minFreq: 20,
		maxFreq: 22000,
		mode: 6,
		ansiBands: true,
		fftSize: 8192,
		weightingFilter: "A",
		peakFallSpeed: 0.005,
	});

	return analyzerInstance;
}

export const audioElementAtom = atom(sharedAudioElement);
export const audioMotionAnalyzerAtom = atom(() => getAnalyzer());
export const mediaStreamAtom = atom<MediaStream | null>(null);
