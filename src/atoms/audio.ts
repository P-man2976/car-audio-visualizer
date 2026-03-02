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

/**
 * WebKit/iOS Safari 固有の AudioContext 状態管理
 *
 * Safari では AudioContext が "interrupted" 状態になるケースがある：
 *   - iOS: Phone着信、Siri 起動、他アプリへの切り替えなど
 *   - Headless WebKit: オーディオデバイスなし環境
 *
 * audiomotion-analyzer の内部 unlockContext は
 *   `state === "suspended"` のみチェックし、"interrupted" を取りこぼす。
 * statechange イベントを監視して interrupted → suspended 遷移後に
 * 自動 resume() する。
 */
const audioCtx = analyzerInstance.audioCtx;
let _wasInterrupted = false;
let _analyzerWasOn = false;

audioCtx.addEventListener("statechange", () => {
	const state = audioCtx.state as string;
	if (state === "interrupted") {
		// interruption 発生時: 再生中フラグを保存
		_wasInterrupted = true;
		_analyzerWasOn = analyzerInstance.isOn;
	} else if (state === "suspended" && _wasInterrupted) {
		// interruption 解除後に suspended へ戻った場合、手動 resume が必要
		// (iOS は interruption 後に自動で running へ戻らない)
		_wasInterrupted = false;
		if (_analyzerWasOn) {
			// 再生中だった場合のみ自動 resume を試みる
			void audioCtx.resume().then(() => {
				if (!analyzerInstance.isOn) analyzerInstance.start();
			});
		}
	}
});
