/**
 * Safari WebKit バグ (Bug 266922, 180696) 回避用ビジュアライゼーションブリッジ。
 *
 * Safari 18.x では createMediaElementSource() が完全に機能せず、
 * MediaElementAudioSourceNode (MECSN) が無音を返す。
 * WAV ファイルですら動作しないため、ブラウザ側の修正待ちとなる。
 *
 * このブリッジは hls.js の内部イベントから fMP4 オーディオセグメントを横取りし、
 * decodeAudioData() でデコードして AudioBufferSourceNode 経由で
 * AudioMotionAnalyzer の入力に流す。
 *
 * 実際のオーディオ出力は audioElement が担当し（destination には接続しない）、
 * ブリッジはビジュアライザー用の周波数データのみを提供する。
 */

import type AudioMotionAnalyzer from "audiomotion-analyzer";
import {
	Events,
	type BufferAppendingData,
	type BufferCodecsData,
} from "hls.js";
import type Hls from "hls.js";

/**
 * Safari の MECSN バグが存在するかを判定する。
 * WebKit ベースかつ Chrome/Chromium でないブラウザ (= Safari) で true を返す。
 */
export function isMECSNBroken(): boolean {
	if (typeof navigator === "undefined") return false;
	return (
		/AppleWebKit/.test(navigator.userAgent) &&
		!/Chrome/.test(navigator.userAgent)
	);
}

/**
 * fMP4 バイナリの先頭ボックスタイプを読み取る。
 * MP4 ボックスはバイト 4-7 に 4 文字の ASCII タイプが入る。
 */
export function readBoxType(data: Uint8Array): string {
	if (data.length < 8) return "";
	return String.fromCharCode(data[4], data[5], data[6], data[7]);
}

export class SafariVizBridge {
	private readonly audioCtx: AudioContext;
	private readonly vizGain: GainNode;
	private readonly analyzer: AudioMotionAnalyzer;
	private initSegment: Uint8Array | null = null;
	private activeSources = new Set<AudioBufferSourceNode>();
	private hls: Hls | null = null;
	/** 次の AudioBufferSourceNode の再生開始時刻 (audioCtx.currentTime 基準) */
	private nextStartTime = 0;

	constructor(analyzer: AudioMotionAnalyzer) {
		this.analyzer = analyzer;
		this.audioCtx = analyzer.audioCtx;

		// ビジュアライザー専用の GainNode を作成。
		// destination には接続しない（二重音声を防ぐ）。
		this.vizGain = this.audioCtx.createGain();
		this.vizGain.gain.value = 1;

		// AudioMotionAnalyzer の _input GainNode に接続
		analyzer.connectInput(this.vizGain);
	}

	/**
	 * hls.js インスタンスにイベントリスナーを登録し、
	 * オーディオセグメントの横取りを開始する。
	 */
	attach(hls: Hls): void {
		this.detach();
		this.hls = hls;
		this.initSegment = null;
		this.nextStartTime = 0;

		hls.on(Events.BUFFER_CODECS, this.onBufferCodecs);
		hls.on(Events.BUFFER_APPENDING, this.onBufferAppending);
	}

	/**
	 * hls.js からイベントリスナーを解除し、再生中のソースを停止する。
	 * ブリッジ自体は破棄せず再利用可能。
	 */
	detach(): void {
		if (this.hls) {
			this.hls.off(Events.BUFFER_CODECS, this.onBufferCodecs);
			this.hls.off(Events.BUFFER_APPENDING, this.onBufferAppending);
			this.hls = null;
		}
		this.stopAllSources();
		this.initSegment = null;
		this.nextStartTime = 0;
	}

	/**
	 * ブリッジを完全に破棄する。
	 * アナライザーからの切断も行う。
	 */
	destroy(): void {
		this.detach();
		this.analyzer.disconnectInput(this.vizGain);
	}

	/**
	 * BUFFER_CODECS イベントハンドラ。
	 * hls.js の transmux が生成した fMP4 初期化セグメント (ftyp + moov) を取得する。
	 */
	private onBufferCodecs = (
		_event: Events.BUFFER_CODECS,
		data: BufferCodecsData,
	): void => {
		const init = data.audio?.initSegment;
		if (init) {
			// コピーを保持（hls.js が内部バッファを再利用する可能性があるため）
			this.initSegment = new Uint8Array(init);
		}
	};

	/**
	 * BUFFER_APPENDING イベントハンドラ。
	 * fMP4 メディアセグメント (moof + mdat) を受け取り、
	 * 初期化セグメントと結合して decodeAudioData() でデコードする。
	 */
	private onBufferAppending = (
		_event: Events.BUFFER_APPENDING,
		data: BufferAppendingData,
	): void => {
		if (data.type !== "audio" || !this.initSegment) return;

		const segmentData = data.data;

		// メディアセグメント (moof) のみ処理。初期化セグメント (ftyp/styp) はスキップ。
		const boxType = readBoxType(segmentData);
		if (boxType !== "moof") return;

		// fMP4 初期化セグメント (ftyp+moov) + メディアセグメント (moof+mdat) を結合し
		// decodeAudioData() がデコード可能な完全な MP4 にする。
		const combined = new Uint8Array(
			this.initSegment.length + segmentData.length,
		);
		combined.set(this.initSegment, 0);
		combined.set(segmentData, this.initSegment.length);

		// decodeAudioData はバッファを detach するため、combined.buffer をそのまま渡せる
		// (new Uint8Array(size) で作成したバッファは byteOffset=0 で安全)
		void this.audioCtx
			.decodeAudioData(combined.buffer)
			.then((audioBuffer) => this.scheduleBuffer(audioBuffer))
			.catch((err: unknown) => {
				if (import.meta.env.DEV) {
					console.warn("[SafariVizBridge] decodeAudioData failed:", err);
				}
			});
	};

	/**
	 * デコード済み AudioBuffer をスケジュール再生する。
	 *
	 * 前のセグメントの終了時刻から連続再生することでギャップを最小化する。
	 * デコード遅延で追いつけない場合は即座に再生を開始する。
	 */
	private scheduleBuffer(audioBuffer: AudioBuffer): void {
		const source = this.audioCtx.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(this.vizGain);

		const now = this.audioCtx.currentTime;
		const startTime = Math.max(this.nextStartTime, now);
		source.start(startTime);
		this.nextStartTime = startTime + audioBuffer.duration;

		this.activeSources.add(source);
		source.onended = () => {
			source.disconnect();
			this.activeSources.delete(source);
		};
	}

	/** 全アクティブソースを停止・切断する。 */
	private stopAllSources(): void {
		for (const source of this.activeSources) {
			try {
				source.stop();
				source.disconnect();
			} catch {
				// 既に停止済み
			}
		}
		this.activeSources.clear();
	}
}
