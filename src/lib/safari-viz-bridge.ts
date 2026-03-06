/**
 * Safari WebKit バグ (Bug 266922, 180696) 回避用ビジュアライゼーションブリッジ。
 *
 * Safari 18.x では createMediaElementSource() が完全に機能せず、
 * MediaElementAudioSourceNode (MECSN) が無音を返す。
 * WAV ファイルですら動作しないため、ブラウザ側の修正待ちとなる。
 *
 * このブリッジは hls.js の内部イベントから fMP4 オーディオセグメントを横取りし、
 * decodeAudioData() でデコードして AudioBufferSourceNode 経由で
 * ブリッジ専用の AnalyserNode に流す。
 *
 * audiomotion-analyzer の内部 _analyzer[0] をブリッジ専用ノードに差し替えることで、
 * getBars() がブリッジのデータを読むようにする。
 * ブリッジ専用 AnalyserNode は destination に接続しないため二重音声を防ぐ。
 * 実際のオーディオ出力は audioElement が直接スピーカーに出力する
 * （Safari では MECSN が壊れているため、Web Audio グラフを経由しない）。
 */

import type AudioMotionAnalyzer from "audiomotion-analyzer";
import type Hls from "hls.js";
import {
	type BufferAppendingData,
	type BufferCodecsData,
	Events,
} from "hls.js";

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
	/** getBars() が読む差し替え用 AnalyserNode（destination 未接続） */
	private readonly bridgeAnalyser: AnalyserNode;
	/** 差し替え前のオリジナル AnalyserNode（destroy 時に復元用） */
	private readonly originalAnalyser: AnalyserNode;
	private initSegment: Uint8Array | null = null;
	private activeSources = new Set<AudioBufferSourceNode>();
	private hls: Hls | null = null;
	/** 次の AudioBufferSourceNode の再生開始時刻 (audioCtx.currentTime 基準) */
	private nextStartTime = 0;

	// ─── File playback fields ─────────────────────────────────────────────
	/** デコード済み AudioBuffer（ファイル全体） */
	private fileAudioBuffer: AudioBuffer | null = null;
	/** ファイルモードで監視中の audio 要素 */
	private fileAudioElement: HTMLAudioElement | null = null;
	/** 現在再生中の AudioBufferSourceNode（ファイルモード用・1 つだけ） */
	private fileSource: AudioBufferSourceNode | null = null;

	constructor(analyzer: AudioMotionAnalyzer) {
		this.analyzer = analyzer;
		this.audioCtx = analyzer.audioCtx;

		// audiomotion-analyzer の内部 AnalyserNode を取得
		// biome-ignore lint/suspicious/noExplicitAny: private API access
		const inst = analyzer as any;
		const origAnalyser: AnalyserNode = inst._analyzer[0];
		this.originalAnalyser = origAnalyser;

		// ブリッジ専用 AnalyserNode を作成（destination に接続しない = 二重音声防止）
		// オリジナルと同じ FFT 設定を引き継ぐ
		this.bridgeAnalyser = this.audioCtx.createAnalyser();
		this.bridgeAnalyser.fftSize = origAnalyser.fftSize;
		this.bridgeAnalyser.minDecibels = origAnalyser.minDecibels;
		this.bridgeAnalyser.maxDecibels = origAnalyser.maxDecibels;
		this.bridgeAnalyser.smoothingTimeConstant =
			origAnalyser.smoothingTimeConstant;

		// vizGain → bridgeAnalyser の接続（dead-end: destination には到達しない）
		this.vizGain = this.audioCtx.createGain();
		this.vizGain.gain.value = 1;
		this.vizGain.connect(this.bridgeAnalyser);

		// _analyzer[0] を差し替えて getBars() がブリッジから読むようにする
		// オリジナルは graph 内に残るが、MECSN が壊れているため無音のまま
		inst._analyzer[0] = this.bridgeAnalyser;
	}

	/**
	 * hls.js インスタンスにイベントリスナーを登録し、
	 * オーディオセグメントの横取りを開始する。
	 */
	attach(hls: Hls): void {
		this.detach();
		this.detachFile();
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

	// ─── File playback mode ──────────────────────────────────────────────

	/**
	 * ファイル（blob URL）をデコードし、audioElement と同期して
	 * ブリッジ AnalyserNode にデータを流す。
	 *
	 * Safari では MECSN が壊れているため、ファイル再生時もこのブリッジ経由で
	 * ビジュアライザーにデータを供給する必要がある。
	 *
	 * decodeAudioData() でファイル全体をメモリ上にデコードするため、
	 * 長時間のファイルではメモリ消費が増加する点に注意。
	 */
	async attachFile(
		blobUrl: string,
		audioElement: HTMLAudioElement,
	): Promise<void> {
		this.detach();
		this.detachFile();

		const response = await fetch(blobUrl);
		const arrayBuffer = await response.arrayBuffer();
		const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

		this.fileAudioBuffer = audioBuffer;
		this.fileAudioElement = audioElement;

		// イベントリスナーで play/pause/seek に同期
		audioElement.addEventListener("play", this.onFilePlay);
		audioElement.addEventListener("pause", this.onFilePause);
		audioElement.addEventListener("seeked", this.onFileSeeked);

		// 既に再生中なら即座にブリッジ再生を開始
		if (!audioElement.paused) {
			this.startFilePlayback();
		}
	}

	/**
	 * ファイルモードをクリーンアップする。
	 * イベントリスナー解除、ソース停止、AudioBuffer 解放。
	 */
	detachFile(): void {
		this.stopFileSource();
		if (this.fileAudioElement) {
			this.fileAudioElement.removeEventListener("play", this.onFilePlay);
			this.fileAudioElement.removeEventListener("pause", this.onFilePause);
			this.fileAudioElement.removeEventListener("seeked", this.onFileSeeked);
			this.fileAudioElement = null;
		}
		this.fileAudioBuffer = null;
	}

	/**
	 * AudioBufferSourceNode を作成し、audioElement.currentTime に合わせて
	 * オフセット再生を開始する。
	 */
	private startFilePlayback(): void {
		if (!this.fileAudioBuffer || !this.fileAudioElement) return;
		this.stopFileSource();

		const source = this.audioCtx.createBufferSource();
		source.buffer = this.fileAudioBuffer;
		source.connect(this.vizGain);

		const offset = this.fileAudioElement.currentTime;
		source.start(0, offset);

		this.fileSource = source;
		source.onended = () => {
			if (this.fileSource === source) {
				this.fileSource = null;
			}
		};
	}

	/** ファイルモードの再生中ソースを停止する。 */
	private stopFileSource(): void {
		if (this.fileSource) {
			try {
				this.fileSource.stop();
				this.fileSource.disconnect();
			} catch {
				// 既に停止済み
			}
			this.fileSource = null;
		}
	}

	private onFilePlay = (): void => {
		this.startFilePlayback();
	};

	private onFilePause = (): void => {
		this.stopFileSource();
	};

	private onFileSeeked = (): void => {
		if (this.fileAudioElement && !this.fileAudioElement.paused) {
			this.startFilePlayback();
		}
	};

	/**
	 * ブリッジを完全に破棄する。
	 * オリジナルの AnalyserNode を復元する。
	 */
	destroy(): void {
		this.detach();
		this.detachFile();
		this.vizGain.disconnect();
		// biome-ignore lint/suspicious/noExplicitAny: private API access
		const inst = this.analyzer as any;
		inst._analyzer[0] = this.originalAnalyser;
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
	 * frag.start で取得したメディアタイムライン位置を保持し、
	 * scheduleBuffer 内で audio 要素の currentTime と同期させる。
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

		// メディアタイムライン上のセグメント開始位置
		const mediaStartTime = data.frag.start;

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
			.then((audioBuffer) => this.scheduleBuffer(audioBuffer, mediaStartTime))
			.catch((err: unknown) => {
				if (import.meta.env.DEV) {
					console.warn("[SafariVizBridge] decodeAudioData failed:", err);
				}
			});
	};

	/**
	 * デコード済み AudioBuffer をメディアタイムラインに同期してスケジュール再生する。
	 *
	 * audio 要素の currentTime とセグメントの mediaStartTime の差分を
	 * ディレイとして計算し、実際の音声再生と同期させる。
	 * プリバッファリングされた先行セグメントは未来の時刻にスケジュールされ、
	 * 既に通過済みのセグメントは即座に再生する。
	 */
	private scheduleBuffer(
		audioBuffer: AudioBuffer,
		mediaStartTime: number,
	): void {
		const source = this.audioCtx.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(this.vizGain);

		const now = this.audioCtx.currentTime;
		const mediaElement = this.hls?.media;
		let startTime: number;

		if (mediaElement && !mediaElement.paused) {
			// audio 要素の現在位置とセグメントの開始位置の差分をディレイとする
			const delay = mediaStartTime - mediaElement.currentTime;
			startTime = now + Math.max(delay, 0);
		} else {
			// 一時停止中・メディア未接続の場合はフォールバック
			startTime = Math.max(this.nextStartTime, now);
		}

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
