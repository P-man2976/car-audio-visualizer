import { atom } from "jotai";
import type { Song } from "@/types/player";

export type Source = "off" | "radio" | "aux" | "file";

export const currentSrcAtom = atom<Source>("off");
export const isPlayingAtom = atom(false);
export const progressAtom = atom(0);
export const volumeAtom = atom(70);

/** Radio recently-played station names */
export const queueAtom = atom<string[]>([]);

/** File playback */
export const currentSongAtom = atom<Song | null>(null);
export const songQueueAtom = atom<Song[]>([]);
export const songHistoryAtom = atom<Song[]>([]);
