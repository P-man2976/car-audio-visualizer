import { atom } from "jotai";
import type { Song } from "@/types/player";
import type { Radio } from "../types/radio";

export type Source = "off" | "radio" | "aux" | "file";

export const currentSrcAtom = atom<Source>("off");
export const isPlayingAtom = atom(false);
export const progressAtom = atom(0);
export const volumeAtom = atom(70);

/** Radio recently-played stations */
export const queueAtom = atom<Radio[]>([]);

/** File playback */
export const currentSongAtom = atom<Song | null>(null);
export const songQueueAtom = atom<Song[]>([]);
export const songHistoryAtom = atom<Song[]>([]);
