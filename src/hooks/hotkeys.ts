import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { audioElementAtom } from "@/atoms/audio";
import {
	hotkeyBindingsAtom,
	normalizeKey,
	settingsOpenAtom,
} from "@/atoms/hotkeys";
import {
	currentSrcAtom,
	isPlayingAtom,
	muteAtom,
	volumeAtom,
} from "@/atoms/player";
import {
	currentRadioAtom,
	radioChannelsByAreaAtom,
	type ChannelNum,
} from "@/atoms/radio";
import { getDisplayMediaConstraints } from "@/lib/aux-media";
import { useRadikoArea } from "@/services/radiko";
import { useMediaStream } from "./mediastream";
import { usePlayer } from "./player";
import { useRadioPlayer, useTunableStations, useSelectRadio } from "./radio";

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
	const currentRadio = useAtomValue(currentRadioAtom);
	const channelsByArea = useAtomValue(radioChannelsByAreaAtom);
	const [, setVolume] = useAtom(volumeAtom);
	const [mute, setMute] = useAtom(muteAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);
	const [settingsOpen, setSettingsOpen] = useAtom(settingsOpenAtom);
	const { play, pause, stop, next, prev } = usePlayer();
	const { playRadio, stopRadio, tune } = useRadioPlayer();
	const { connect, disconnect } = useMediaStream();
	const areaId = useRadikoArea();
	const tunableStations = useTunableStations();
	const selectRadio = useSelectRadio();

	/** 設定ダイアログが開いている間は再生操作系を無効化 */
	const enabled = !settingsOpen;

	// ─── 設定を開く / 閉じる ─────────────────────────────────────
	// react-hotkeys-hook ではなく直接 keydown を使う（フォーカス問題を回避）
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			// input/textarea/select が focused のときは無視
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			if (normalizeKey(e.key) === bindings.openSettings) {
				e.preventDefault();
				setSettingsOpen((v) => !v);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [bindings.openSettings, setSettingsOpen]);

	// ─── チャンネルショートカット 1〜6 ────────────────────────────
	useHotkeys(
		["1", "2", "3", "4", "5", "6"],
		(e) => {
			const ch = Number.parseInt(e.key) as ChannelNum;
			// 設定ダイアログでの入力中は無視（捕捉中は他ショートカットも制御済み）
			if (settingsOpen) return;

			// ラジオモード以外から来た場合は前回のバンドを使用
			const band = currentRadio?.type ?? "FM";
			const bandKey = band === "FM" ? "fm" : "am";
			const areaChannels = areaId ? channelsByArea[areaId] : undefined;
			const preset = areaChannels?.[bandKey]?.[ch];

			// aux モードは先に切断
			if (currentSrc === "aux") disconnect();
			setCurrentSrc("radio");

			if (preset) {
				selectRadio({
					type: preset.type,
					source: "radiko",
					id: preset.stationId,
					name: preset.stationName,
					frequency: preset.freq,
				});
			} else {
				// プリセット未設定: デフォルト周波数（FM 76.0 / AM 531）に最も近い局へ
				const defaultFreq = band === "FM" ? 76.0 : 531;
				const bandStations = tunableStations.filter((s) => s.type === band);
				const nearest = bandStations.reduce<(typeof bandStations)[0] | null>(
					(best, s) =>
						!best ||
						Math.abs(s.freq - defaultFreq) < Math.abs(best.freq - defaultFreq)
							? s
							: best,
					null,
				);
				if (nearest) {
					selectRadio({
						type: nearest.type,
						source: "radiko",
						id: nearest.id,
						name: nearest.name,
						logo: nearest.logo,
						frequency: nearest.freq,
					});
				}
			}
		},
		{ preventDefault: true },
		[
			settingsOpen,
			currentSrc,
			currentRadio,
			areaId,
			channelsByArea,
			tunableStations,
			selectRadio,
			setCurrentSrc,
			disconnect,
		],
	);

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
		{ preventDefault: true, enabled },
		[
			bindings.playPause,
			currentSrc,
			isPlaying,
			playRadio,
			stopRadio,
			play,
			pause,
			enabled,
		],
	);

	// ─── 停止 ──────────────────────────────────────────────────────
	useHotkeys(
		bindings.stop,
		() => {
			if (currentSrc === "radio") stopRadio();
			else stop();
		},
		{ preventDefault: true, enabled },
		[bindings.stop, currentSrc, stopRadio, stop, enabled],
	);

	// ─── 前のトラック / 周波数↓ ────────────────────────────────────
	useHotkeys(
		bindings.prevOrTuneDown,
		() => {
			if (currentSrc === "radio") tune(-1);
			else if (currentSrc === "file") prev();
		},
		{ preventDefault: true, enabled },
		[bindings.prevOrTuneDown, currentSrc, tune, prev, enabled],
	);

	// ─── 次のトラック / 周波数↑ ────────────────────────────────────
	useHotkeys(
		bindings.nextOrTuneUp,
		() => {
			if (currentSrc === "radio") tune(1);
			else if (currentSrc === "file") next();
		},
		{ preventDefault: true, enabled },
		[bindings.nextOrTuneUp, currentSrc, tune, next, enabled],
	);

	// ─── 音量 +5 ──────────────────────────────────────────────────
	useHotkeys(
		bindings.volumeUp,
		() => {
			setVolume((v) => Math.min(100, v + 5));
			if (mute) setMute(false);
		},
		{ preventDefault: true, enabled },
		[bindings.volumeUp, mute, setVolume, setMute, enabled],
	);

	// ─── 音量 -5 ──────────────────────────────────────────────────
	useHotkeys(
		bindings.volumeDown,
		() => {
			setVolume((v) => Math.max(0, v - 5));
		},
		{ preventDefault: true, enabled },
		[bindings.volumeDown, setVolume, enabled],
	);

	// ─── ミュート切り替え ─────────────────────────────────────────
	useHotkeys(
		bindings.mute,
		() => {
			setMute((prev) => !prev);
		},
		{ preventDefault: true, enabled },
		[bindings.mute, setMute, enabled],
	);

	// ─── 10秒戻し — ファイルのみ ───────────────────────────────────
	useHotkeys(
		bindings.seekBack,
		() => {
			if (currentSrc === "file") {
				audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
			}
		},
		{ preventDefault: true, enabled },
		[bindings.seekBack, audioElement, currentSrc, enabled],
	);

	// ─── 10秒送り — ファイルのみ ───────────────────────────────────
	useHotkeys(
		bindings.seekForward,
		() => {
			if (currentSrc === "file") {
				audioElement.currentTime = Math.min(
					audioElement.duration || 0,
					audioElement.currentTime + 10,
				);
			}
		},
		{ preventDefault: true, enabled },
		[bindings.seekForward, audioElement, currentSrc, enabled],
	);

	// ─── PiP 切り替え ────────────────────────────────────────────
	useHotkeys(
		bindings.togglePiP,
		() => {
			if (isPiP) exitPiP?.();
			else void enterPiP?.();
		},
		{ preventDefault: true, enabled },
		[bindings.togglePiP, isPiP, enterPiP, exitPiP, enabled],
	);

	// ─── フルスクリーン切り替え ────────────────────────────────────
	useHotkeys(
		bindings.toggleFullscreen,
		() => {
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen().catch(console.error);
			} else {
				document.exitFullscreen().catch(console.error);
			}
		},
		{ preventDefault: true, enabled },
		[bindings.toggleFullscreen, enabled],
	);

	// ─── ファイルモード ───────────────────────────────────────────
	useHotkeys(
		bindings.modeFile,
		() => {
			if (currentSrc === "aux") disconnect();
			setCurrentSrc("file");
		},
		{ preventDefault: true, enabled },
		[bindings.modeFile, currentSrc, disconnect, setCurrentSrc, enabled],
	);

	// ─── ラジオモード ─────────────────────────────────────────────
	useHotkeys(
		bindings.modeRadio,
		() => {
			if (currentSrc === "aux") disconnect();
			setCurrentSrc("radio");
		},
		{ preventDefault: true, enabled },
		[bindings.modeRadio, currentSrc, disconnect, setCurrentSrc, enabled],
	);

	// ─── 画面共有モード ───────────────────────────────────────────
	useHotkeys(
		bindings.modeScreen,
		() => {
			navigator.mediaDevices
				.getDisplayMedia(getDisplayMediaConstraints())
				.then((stream) => connect(stream))
				.catch(console.error);
		},
		{ preventDefault: true, enabled },
		[bindings.modeScreen, connect, enabled],
	);

	// ─── 外部入力 / マイクモード ───────────────────────────────────
	useHotkeys(
		bindings.modeAux,
		() => {
			navigator.mediaDevices
				.getUserMedia({ audio: true, video: false })
				.then((stream) => connect(stream))
				.catch(console.error);
		},
		{ preventDefault: true, enabled },
		[bindings.modeAux, connect, enabled],
	);
}
