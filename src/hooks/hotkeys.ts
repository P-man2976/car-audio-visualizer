import { useAtomValue } from "jotai";
import { useHotkeys } from "react-hotkeys-hook";
import { hotkeyBindingsAtom } from "../atoms/hotkeys";
import { currentSrcAtom, isPlayingAtom } from "../atoms/player";
import { usePlayer } from "./player";
import { useRadioPlayer } from "./radio";

/**
 * アプリ全体のキーボードショートカットを登録するフック。
 * ControlsOverlay でマウントする。
 */
export function useAppHotkeys() {
	const bindings = useAtomValue(hotkeyBindingsAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const { play, pause, stop, next, prev } = usePlayer();
	const { playRadio, stopRadio, tune } = useRadioPlayer();

	// 再生 / 一時停止
	useHotkeys(
		bindings.playPause,
		() => {
			if (currentSrc === "radio") {
				isPlaying ? stopRadio() : playRadio();
			} else if (currentSrc === "file") {
				isPlaying ? pause() : void play();
			}
		},
		{ preventDefault: true },
		[currentSrc, isPlaying, playRadio, stopRadio, play, pause],
	);

	// 停止
	useHotkeys(
		bindings.stop,
		() => {
			if (currentSrc === "radio") stopRadio();
			else stop();
		},
		{ preventDefault: true },
		[currentSrc, stopRadio, stop],
	);

	// 前のトラック / 周波数↓
	useHotkeys(
		bindings.prevOrTuneDown,
		() => {
			if (currentSrc === "radio") tune(-1);
			else if (currentSrc === "file") prev();
		},
		{ preventDefault: true },
		[currentSrc, tune, prev],
	);

	// 次のトラック / 周波数↑
	useHotkeys(
		bindings.nextOrTuneUp,
		() => {
			if (currentSrc === "radio") tune(1);
			else if (currentSrc === "file") next();
		},
		{ preventDefault: true },
		[currentSrc, tune, next],
	);
}
