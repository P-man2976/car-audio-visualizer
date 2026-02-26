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
		minFreq: 32,
		maxFreq: 22000,
		mode: 8,
		ansiBands: true,
		weightingFilter: "A",
	});

	return analyzerInstance;
}

export const audioElementAtom = atom(sharedAudioElement);
export const audioMotionAnalyzerAtom = atom(() => getAnalyzer());
export const mediaStreamAtom = atom<MediaStream | null>(null);
