import AudioMotionAnalyzer from "audiomotion-analyzer";
import { atom } from "jotai";

const sharedAudioElement = new Audio();
sharedAudioElement.crossOrigin = "anonymous";

let analyzerInstance: AudioMotionAnalyzer | null = null;

/**
 * AudioMotionAnalyzer の遅延初期化。
 *
 * Safari でのファイル再生時にビジュアライザーが更新されない問題を解決するために
 * lazy initializer を使用しています。eager init にすると、モジュールロード時に
 * AudioContext が suspended 状態のままアナライザーが初期化され、getBars() が
 * データを返さないという問題が発生します。
 *
 * Jotai の atom lazy initializer を使用することで、最初の useAtomValue が
 * Canvas 外で実行される際に初期化され、Safari での AudioContext の状態が
 * より安定した状態になります。
 */
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
		peakFallSpeed: 0.005,
	});

	return analyzerInstance;
}

export const audioElementAtom = atom(sharedAudioElement);
export const audioMotionAnalyzerAtom = atom(() => getAnalyzer());
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
	console.log("[audio] audioCtx statechange:", state);
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
			console.log("[audio] interrupted → suspended: auto resume()");
			void audioCtx.resume().then(() => {
				console.log("[audio] auto resume() resolved, audioCtx.state:", audioCtx.state);
				if (!analyzerInstance.isOn) analyzerInstance.start();
			});
		}
	}
});
