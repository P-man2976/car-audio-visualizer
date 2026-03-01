import AudioMotionAnalyzer from "audiomotion-analyzer";
import { atom } from "jotai";

const sharedAudioElement = new Audio();
sharedAudioElement.crossOrigin = "anonymous";

/**
 * AudioMotionAnalyzer をモジュールロード時に即時生成する。
 *
 * 遅延初期化（lazy）にすると、最初の読み取りが R3F Canvas 内
 * （VisualizerStandard 等の useAtomValue）になるケースがある。
 * その場合、Three.js の WebGL コンテキスト確保と同タイミングで
 * AudioMotionAnalyzer 内部の canvas/OffscreenCanvas が生成され、
 * ブラウザの WebGL コンテキスト上限に達して Context Lost が発生する。
 * Canvas より先にモジュールレベルで生成することでこの競合を防ぐ。
 */
const analyzerInstance = new AudioMotionAnalyzer(undefined, {
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

export const audioElementAtom = atom(sharedAudioElement);
export const audioMotionAnalyzerAtom = atom(analyzerInstance);
export const mediaStreamAtom = atom<MediaStream | null>(null);
