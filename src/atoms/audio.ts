import AudioMotionAnalyzer from "audiomotion-analyzer";
import { atom } from "jotai";
import { SafariVizBridge, isMECSNBroken } from "@/lib/safari-viz-bridge";
import { AM_FILTER_FREQ } from "./amFilter";

const sharedAudioElement = new Audio();

/**
 * AudioMotionAnalyzer をモジュールロード時に即時生成する。
 *
 * 遅延初期化（lazy）にすると、最初の読み取りが R3F Canvas 内
 * （VisualizerStandard 等の useAtomValue）になるケースがある。
 * その場合、Three.js の WebGL コンテキスト確保と同タイミングで
 * AudioMotionAnalyzer 内部の canvas/OffscreenCanvas が生成され、
 * ブラウザの WebGL コンテキスト上限に達して Context Lost が発生する。
 * Canvas より先にモジュールレベルで生成することでこの競合を防ぐ。
 *
 * NOTE: source を渡さずに生成し、再生開始時に connectAudioSource() で
 * 遅延接続する。Safari では空の audio 要素に対して createMediaElementSource()
 * を呼ぶと MECSN が無音になるバグがあるため。
 */
const analyzerInstance = new AudioMotionAnalyzer(undefined, {
	useCanvas: false,
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

// ─── AM ラジオ帯域フィルタ ────────────────────────────────────────────────────
//
// audio 要素 → MECSN → amLowpassFilter → analyzerInstance._input → ...destination
// フィルタは常にチェーンに挿入され、無効時はカットオフを Nyquist に設定して
// 全帯域通過（実質バイパス）にする。

const _audioCtx = analyzerInstance.audioCtx;

const amLowpassFilter = _audioCtx.createBiquadFilter();
amLowpassFilter.type = "lowpass";
// 初期状態はバイパス（Nyquist ＝ 全帯域通過）
amLowpassFilter.frequency.value = _audioCtx.sampleRate / 2;
// Butterworth フラットレスポンス
amLowpassFilter.Q.value = 0.707;

/**
 * AM フィルタの有効/無効を切り替える。
 *
 * @param active - true: ローパス 4500Hz（AM 帯域制限）、false: バイパス
 */
export function setAmFilterActive(active: boolean): void {
	amLowpassFilter.frequency.setTargetAtTime(
		active ? AM_FILTER_FREQ : _audioCtx.sampleRate / 2,
		_audioCtx.currentTime,
		0.02, // 20ms スムーズ遷移
	);
}

/**
 * audio 要素を AudioMotionAnalyzer に接続する。
 *
 * Safari は audio 要素にソースが設定される前に createMediaElementSource() を
 * 呼ぶと MediaElementAudioSourceNode が無音になる。
 * play() 成功後（ソース確定済み）に一度だけ呼ぶことで回避する。
 *
 * audio → MECSN → amLowpassFilter → analyzerInstance（→ destination）
 */
let _audioSourceConnected = false;
export function connectAudioSource(): void {
	if (_audioSourceConnected) return;
	_audioSourceConnected = true;

	const mecsn = _audioCtx.createMediaElementSource(sharedAudioElement);
	mecsn.connect(amLowpassFilter);
	analyzerInstance.connectInput(amLowpassFilter);
}

export const audioElementAtom = atom(sharedAudioElement);
export const audioMotionAnalyzerAtom = atom(analyzerInstance);
export const mediaStreamAtom = atom<MediaStream | null>(null);

/**
 * Safari の MECSN バグ回避用ブリッジ。Safari 以外では null。
 *
 * Safari 18.x では createMediaElementSource() が返す MECSN が完全に無音になる
 * WebKit バグ (Bug 266922, 180696) があるため、hls.js の内部イベントから
 * fMP4 セグメントを横取りし decodeAudioData() 経由でアナライザーに流す。
 */
export const safariVizBridge: SafariVizBridge | null = isMECSNBroken()
	? new SafariVizBridge(analyzerInstance)
	: null;

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
const audioCtx = _audioCtx;

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
