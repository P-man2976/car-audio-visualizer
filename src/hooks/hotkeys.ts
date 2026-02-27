import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useHotkeys } from "react-hotkeys-hook";
import { audioElementAtom } from "../atoms/audio";
import { hotkeyBindingsAtom } from "../atoms/hotkeys";
import { currentSrcAtom, isPlayingAtom, muteAtom, volumeAtom } from "../atoms/player";
import { getDisplayMediaConstraints } from "../lib/aux-media";
import { useMediaStream } from "./mediastream";
import { usePlayer } from "./player";
import { useRadioPlayer } from "./radio";

export interface AppHotkeysOptions {
	/** ControlsOverlay の usePiP インスタンスから渡す */
	enterPiP?: () => Promise<void>;
	exitPiP?: () => void;
	isPiP?: boolean;
}

/**
 * アプリ全体のキーボードショートカットを登録するフック。
 * ControlsOverlay でマウントし、PiP 制御を options として受け取る。
 */
export function useAppHotkeys(opts: AppHotkeysOptions = {}) {
	const { enterPiP, exitPiP, isPiP = false } = opts;

	const bindings = useAtomValue(hotkeyBindingsAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const audioElement = useAtomValue(audioElementAtom);
	const [, setVolume] = useAtom(volumeAtom);
	const [mute, setMute] = useAtom(muteAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);
	const { play, pause, stop, next, prev } = usePlayer();
	const { playRadio, stopRadio, tune } = useRadioPlayer();
	const { connect, disconnect } = useMediaStream();

	// ─── 再生 / 一時停止（設定キー + K） ──────────────────────────
	useHotkeys(
		[bindings.playPause, "k"],
		() => {
			if (currentSrc === "radio") {
				isPlaying ? stopRadio() : playRadio();
			} else if (currentSrc === "file") {
				isPlaying ? pause() : void play();
			}
		},
		{ preventDefault: true },
		[bindings.playPause, currentSrc, isPlaying, playRadio, stopRadio, play, pause],
	);

	// ─── 停止 ──────────────────────────────────────────────────────
	useHotkeys(
		bindings.stop,
		() => {
			if (currentSrc === "radio") stopRadio();
			else stop();
		},
		{ preventDefault: true },
		[bindings.stop, currentSrc, stopRadio, stop],
	);

	// ─── 前のトラック / 周波数↓ ────────────────────────────────────
	useHotkeys(
		bindings.prevOrTuneDown,
		() => {
			if (currentSrc === "radio") tune(-1);
			else if (currentSrc === "file") prev();
		},
		{ preventDefault: true },
		[bindings.prevOrTuneDown, currentSrc, tune, prev],
	);

	// ─── 次のトラック / 周波数↑ ────────────────────────────────────
	useHotkeys(
		bindings.nextOrTuneUp,
		() => {
			if (currentSrc === "radio") tune(1);
			else if (currentSrc === "file") next();
		},
		{ preventDefault: true },
		[bindings.nextOrTuneUp, currentSrc, tune, next],
	);

	// ─── 音量 +5（↑） ─────────────────────────────────────────────
	useHotkeys(
		"arrowup",
		() => {
			setVolume((v) => Math.min(100, v + 5));
			if (mute) setMute(false); // ミュート中は自動解除
		},
		{ preventDefault: true },
		[mute, setVolume, setMute],
	);

	// ─── 音量 -5（↓） ─────────────────────────────────────────────
	useHotkeys(
		"arrowdown",
		() => {
			setVolume((v) => Math.max(0, v - 5));
		},
		{ preventDefault: true },
		[setVolume],
	);

	// ─── ミュート切り替え（M） ─────────────────────────────────────
	useHotkeys(
		"m",
		() => {
			setMute((prev) => !prev);
		},
		{ preventDefault: true },
		[setMute],
	);

	// ─── 10秒戻し（J）— ファイルのみ ──────────────────────────────
	useHotkeys(
		"j",
		() => {
			if (currentSrc === "file") {
				audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
			}
		},
		{ preventDefault: true },
		[audioElement, currentSrc],
	);

	// ─── 10秒送り（L）— ファイルのみ ──────────────────────────────
	useHotkeys(
		"l",
		() => {
			if (currentSrc === "file") {
				audioElement.currentTime = Math.min(
					audioElement.duration || 0,
					audioElement.currentTime + 10,
				);
			}
		},
		{ preventDefault: true },
		[audioElement, currentSrc],
	);

	// ─── PiP 切り替え（I） ────────────────────────────────────────
	useHotkeys(
		"i",
		() => {
			if (isPiP) exitPiP?.();
			else void enterPiP?.();
		},
		{ preventDefault: true },
		[isPiP, enterPiP, exitPiP],
	);

	// ─── フルスクリーン切り替え（F） ──────────────────────────────
	useHotkeys(
		"f",
		() => {
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen().catch(console.error);
			} else {
				document.exitFullscreen().catch(console.error);
			}
		},
		{ preventDefault: true },
		[],
	);

	// ─── ファイルモード（E） ───────────────────────────────────────
	useHotkeys(
		"e",
		() => {
			if (currentSrc === "aux") disconnect();
			setCurrentSrc("file");
		},
		{ preventDefault: true },
		[currentSrc, disconnect, setCurrentSrc],
	);

	// ─── ラジオモード（R） ────────────────────────────────────────
	useHotkeys(
		"r",
		() => {
			if (currentSrc === "aux") disconnect();
			setCurrentSrc("radio");
		},
		{ preventDefault: true },
		[currentSrc, disconnect, setCurrentSrc],
	);

	// ─── 画面共有モード（T） ───────────────────────────────────────
	useHotkeys(
		"t",
		() => {
			navigator.mediaDevices
				.getDisplayMedia(getDisplayMediaConstraints())
				.then((stream) => connect(stream))
				.catch(console.error);
		},
		{ preventDefault: true },
		[connect],
	);

	// ─── 外部入力 / マイク（Y） ────────────────────────────────────
	useHotkeys(
		"y",
		() => {
			navigator.mediaDevices
				.getUserMedia({ audio: true, video: false })
				.then((stream) => connect(stream))
				.catch(console.error);
		},
		{ preventDefault: true },
		[connect],
	);
}
