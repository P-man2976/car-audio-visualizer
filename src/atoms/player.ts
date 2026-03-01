import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { Song } from "@/types/player";
import type { Radio } from "../types/radio";

export type Source = "off" | "radio" | "aux" | "file";

// aux モードは再起動時に権限が必要なため "off" に戻す
const _currentSrcAtom = atomWithStorage<Source>("cav-current-src-v2", "off");
export const currentSrcAtom = atom(
	(get) => {
		const src = get(_currentSrcAtom);
		return src === "aux" ? "off" : src;
	},
	(_get, set, value: Source) => set(_currentSrcAtom, value),
);
export const isPlayingAtom = atom(false);
export const progressAtom = atom(0);
export const volumeAtom = atom(70);
/** ミュート状態。true のとき audioElement.muted を true にする */
export const muteAtom = atom(false);

/** ファイル再生: シャッフル / リピートモード */
export type RepeatMode = "off" | "one" | "all";
export const shuffleAtom = atom(false);
export const repeatModeAtom = atom<RepeatMode>("off");

/** Radio recently-played stations */
export const queueAtom = atom<Radio[]>([]);

/** File playback */
export const currentSongAtom = atom<Song | null>(null);
export const songQueueAtom = atom<Song[]>([]);
export const songHistoryAtom = atom<Song[]>([]);
