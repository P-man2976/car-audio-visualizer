import AudioMotionAnalyzer from "audiomotion-analyzer";
import { atom } from "jotai";
import { isMECSNBroken, SafariVizBridge } from "@/lib/safari-viz-bridge";
import {
	type AmFilterSettings,
	calcMakeupGain,
	DEFAULT_AM_FILTER_SETTINGS,
	makeDistortionCurve,
} from "./amFilter";

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
	connectSpeakers: false,
});

// ─── 出力音量制御 (ビジュアライザーの後段) ─────────────────────────────────────
// audioElement.volume で音量を制御すると MECSN 経由でビジュアライザーにも
// 減衰した信号が届いてしまうため、Analyzer の出力段に GainNode を挿入し
// ここでのみ音量を制御する。これによりビジュアライザーは常にフルレベルの
// 信号を読み取れる。
const volumeGainNode = analyzerInstance.audioCtx.createGain();
analyzerInstance.connectOutput(volumeGainNode);
volumeGainNode.connect(analyzerInstance.audioCtx.destination);

// ─── AM ラジオフィルタチェーン ────────────────────────────────────────────────
//
// 有効時: MECSN → HPF×4 → LPF×4 → speaker → distortion → compressor → makeupGain → mono → analyzer
//         noise ↗
// 無効時: 全ノードがバイパス状態で全帯域ステレオパススルー。
//
// フィルタは常にチェーンに挿入され、無効時は HPF=1Hz / LPF=Nyquist /
// distortion=null / compressor threshold=0dB に設定してバイパスする。

const _audioCtx = analyzerInstance.audioCtx;

// ── HPF (ハイパスフィルタ): 超低域カット ──
// 4 段カスケード（8 次 = -48dB/oct）で帯域外を急峻にカットする。
// 各段 Q=0.707 (Butterworth) でフラットなパスバンドを維持。
const AM_HPF_STAGES = 4;
const amHighpassFilters: BiquadFilterNode[] = [];
for (let i = 0; i < AM_HPF_STAGES; i++) {
	const f = _audioCtx.createBiquadFilter();
	f.type = "highpass";
	f.frequency.value = 1; // 初期: バイパス（1Hz = 全帯域通過）
	f.Q.value = 0.707;
	amHighpassFilters.push(f);
}

// ── LPF (ローパスフィルタ): AM 帯域上限カット ──
// 4 段カスケード（8 次 = -48dB/oct）で帯域外を急峻にカットする。
// 各段 Q=0.707 (Butterworth) でフラットなパスバンドを維持。
const AM_LPF_STAGES = 4;
const amLowpassFilters: BiquadFilterNode[] = [];
for (let i = 0; i < AM_LPF_STAGES; i++) {
	const f = _audioCtx.createBiquadFilter();
	f.type = "lowpass";
	f.frequency.value = _audioCtx.sampleRate / 2; // 初期: バイパス
	f.Q.value = 0.707;
	amLowpassFilters.push(f);
}

// ── 歪み (WaveShaper): AM 放送のソフトクリッピングを再現 ──

const amDistortion = _audioCtx.createWaveShaper();
amDistortion.curve = null; // 初期: バイパス（リニア）
amDistortion.oversample = "2x"; // エイリアシング防止

// ── スピーカーシミュレーション (ピーキング EQ) ──
// AM ラジオの小型スピーカー特有の共振ピークを再現する。
// gain=0 でバイパス。LPF と歪みの間に配置。
const amSpeakerResonance = _audioCtx.createBiquadFilter();
amSpeakerResonance.type = "peaking";
amSpeakerResonance.frequency.value = 1200; // 初期値
amSpeakerResonance.Q.value = 1.5; // 程よい帯域幅
amSpeakerResonance.gain.value = 0; // 初期: バイパス

/** 最後に適用した distortion amount（同じ値の再生成を避ける） */
let _lastDistortionAmount = -1;
/** 現在のキャッシュ済み curve */
let _cachedDistortionCurve: Float32Array | null = null;

/**
 * 指定 amount の歪みカーブを取得する。同じ値なら前回のキャッシュを返す。
 */
function getDistortionCurve(amount: number): Float32Array {
	if (amount !== _lastDistortionAmount || _cachedDistortionCurve === null) {
		_cachedDistortionCurve = makeDistortionCurve(amount);
		_lastDistortionAmount = amount;
	}
	return _cachedDistortionCurve;
}

// ── コンプレッサー (自動利得制御 / AGC) ──
// AM 放送のダイナミックレンジ圧縮を再現する。
const amCompressor = _audioCtx.createDynamicsCompressor();
amCompressor.threshold.value = 0; // 初期: バイパス（0dB = 圧縮なし）
amCompressor.knee.value = 10;
amCompressor.ratio.value = 1; // 初期: バイパス（1:1 = 圧縮なし）
amCompressor.attack.value = 0.003;
amCompressor.release.value = 0.25;

// ── メイクアップゲイン ──
// コンプレッサーで失われた音量を静的に補正する。
// threshold/ratio から calcMakeupGain() で算出した dB をリニアに変換して適用。
const makeupGainNode = _audioCtx.createGain();
makeupGainNode.gain.value = 1; // 初期: バイパス（0dB）

/**
 * ステレオ → モノラル ダウンミックスノード。
 *
 * AM フィルタ有効時は channelCount=1 / channelCountMode="explicit" でモノ化。
 * 無効時は channelCountMode="max" でステレオパススルー。
 */
const monoNode = _audioCtx.createGain();
monoNode.channelCount = 2;
monoNode.channelCountMode = "max";
monoNode.channelInterpretation = "speakers";
monoNode.gain.value = 1;

// ── ホワイトノイズ: AM 受信ノイズを再現 ──
// ループ再生される 2 秒間のホワイトノイズバッファ。
// GainNode で音量を制御し、HPF の前段にミックスすることで
// 帯域フィルタを通過したバンドリミテッドノイズになる。
const _noiseBuffer = _audioCtx.createBuffer(
	1,
	_audioCtx.sampleRate * 2,
	_audioCtx.sampleRate,
);
const _noiseData = _noiseBuffer.getChannelData(0);
for (let i = 0; i < _noiseData.length; i++) {
	_noiseData[i] = Math.random() * 2 - 1;
}
const noiseSource = _audioCtx.createBufferSource();
noiseSource.buffer = _noiseBuffer;
noiseSource.loop = true;
noiseSource.start();

const noiseGain = _audioCtx.createGain();
noiseGain.gain.value = 0; // 初期: 無音
noiseSource.connect(noiseGain);
noiseGain.connect(amHighpassFilters[0]); // HPF の前段に接続

// チェーン接続: HPF×4 → LPF×4 → speaker → distortion → compressor → makeupGain → mono
for (let i = 0; i < amHighpassFilters.length - 1; i++) {
	amHighpassFilters[i].connect(amHighpassFilters[i + 1]);
}
amHighpassFilters[amHighpassFilters.length - 1].connect(amLowpassFilters[0]);
for (let i = 0; i < amLowpassFilters.length - 1; i++) {
	amLowpassFilters[i].connect(amLowpassFilters[i + 1]);
}
amLowpassFilters[amLowpassFilters.length - 1].connect(amSpeakerResonance);
amSpeakerResonance.connect(amDistortion);
amDistortion.connect(amCompressor);
amCompressor.connect(makeupGainNode);
makeupGainNode.connect(monoNode);

/**
 * AM フィルタの有効/無効を切り替える。
 * HPF + LPF + 歪み + コンプレッサー + モノラル化 + ノイズを同時に制御する。
 *
 * @param active - true: AM 帯域制限 + 歪み + AGC + モノラル + ブラウンノイズ、false: 全バイパス + ステレオ
 * @param settings - AM フィルタの各パラメーター（デフォルト値使用可）
 */
export function setAmFilterActive(
	active: boolean,
	settings: AmFilterSettings = DEFAULT_AM_FILTER_SETTINGS,
): void {
	// localStorage から読み込んだ旧形式の設定に新フィールドが欠けている場合に備え、
	// デフォルト値とマージする
	const s = { ...DEFAULT_AM_FILTER_SETTINGS, ...settings };
	const now = _audioCtx.currentTime;
	const smooth = 0.02; // 20ms スムーズ遷移

	// ハイパスフィルタ（4 段カスケード: 全段同一カットオフ）
	const hpfTarget = active ? s.hpfFreq : 1;
	for (const hpf of amHighpassFilters) {
		hpf.frequency.setTargetAtTime(hpfTarget, now, smooth);
	}

	// ローパスフィルタ（4 段カスケード: 全段同一カットオフ）
	const lpfTarget = active ? s.lpfFreq : _audioCtx.sampleRate / 2;
	for (const lpf of amLowpassFilters) {
		lpf.frequency.setTargetAtTime(lpfTarget, now, smooth);
	}

	// 歪み（amount=0 はバイパス）
	amDistortion.curve =
		active && s.distortionAmount > 0
			? getDistortionCurve(s.distortionAmount)
			: null;

	// コンプレッサー (AGC)
	amCompressor.threshold.setTargetAtTime(
		active ? s.compThreshold : 0,
		now,
		smooth,
	);
	amCompressor.ratio.setTargetAtTime(active ? s.compRatio : 1, now, smooth);

	// メイクアップゲイン: デフォルト設定を基準 (0dB) として相対的に補正。
	// 閾値を上げる（圧縮減）→ 負のゲイン（減衰）、下げる → 正のゲイン（ブースト）。
	// AM_MAKEUP_OFFSET_DB で全体をさらに減衰させる。
	// 無効時は 1.0 (0dB) でバイパス。
	const AM_MAKEUP_OFFSET_DB = -8;
	let makeupLinear = 1; // バイパス
	if (active) {
		const referenceDb = calcMakeupGain(
			DEFAULT_AM_FILTER_SETTINGS.compThreshold,
			DEFAULT_AM_FILTER_SETTINGS.compRatio,
		);
		const currentDb = calcMakeupGain(s.compThreshold, s.compRatio);
		makeupLinear = 10 ** ((currentDb - referenceDb + AM_MAKEUP_OFFSET_DB) / 20);
	}
	makeupGainNode.gain.setTargetAtTime(makeupLinear, now, smooth);

	// ブラウンノイズ
	noiseGain.gain.setTargetAtTime(active ? s.noiseLevel : 0, now, smooth);

	// スピーカーシミュレーション（ピーキング EQ）
	amSpeakerResonance.frequency.setTargetAtTime(
		active ? s.speakerResonanceFreq : 1200,
		now,
		smooth,
	);
	amSpeakerResonance.gain.setTargetAtTime(
		active ? s.speakerResonanceGain : 0,
		now,
		smooth,
	);

	// モノラル化
	monoNode.channelCount = active ? 1 : 2;
	monoNode.channelCountMode = active ? "explicit" : "max";
}

/**
 * audio 要素を AudioMotionAnalyzer に接続する。
 *
 * Safari は audio 要素にソースが設定される前に createMediaElementSource() を
 * 呼ぶと MediaElementAudioSourceNode が無音になる。
 * play() 成功後（ソース確定済み）に一度だけ呼ぶことで回避する。
 *
 * audio → MECSN → HPF×4 → LPF×4 → speaker → distortion → compressor → makeupGain → monoNode → analyzer → volumeGain → destination
 */
let _audioSourceConnected = false;
export function connectAudioSource(): void {
	if (_audioSourceConnected) return;
	_audioSourceConnected = true;

	const mecsn = _audioCtx.createMediaElementSource(sharedAudioElement);
	mecsn.connect(amHighpassFilters[0]);
	analyzerInstance.connectInput(monoNode);
}

/**
 * 出力音量とミュートを一括で設定する。
 * volumeGainNode の gain を制御し、audioElement.volume は常に 1 のまま。
 */
export function setOutputVolume(volume: number, mute: boolean): void {
	volumeGainNode.gain.value = mute ? 0 : volume / 100;
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
