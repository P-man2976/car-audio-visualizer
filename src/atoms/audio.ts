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
		weightingFilter: "A",
		peakFallSpeed: 0.005,
	});

	return analyzerInstance;
}

// Destroy the analyzer on page unload so its RAF loop and AudioContext are
// properly torn down before the browser destroys WebGL contexts.  Without this,
// the still-running RAF can race with THREE.WebGLRenderer teardown and cause
// "Context Lost" on the next page load.
if (typeof window !== "undefined") {
	window.addEventListener("beforeunload", () => {
		analyzerInstance?.destroy();
		analyzerInstance = null;
	});
}

export const audioElementAtom = atom(sharedAudioElement);
export const audioMotionAnalyzerAtom = atom(() => getAnalyzer());
export const mediaStreamAtom = atom<MediaStream | null>(null);
