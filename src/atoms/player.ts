import { atom } from "jotai";

export type Source = "off" | "radio" | "aux";

export const currentSrcAtom = atom<Source>("off");
export const isPlayingAtom = atom(false);
export const progressAtom = atom(0);
export const volumeAtom = atom(70);
export const queueAtom = atom<string[]>([]);
