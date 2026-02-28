import { atom } from "jotai";
import type { Radio, RadioType } from "@/types/radio";

export const currentRadioAtom = atom<Radio | null>(null);
export const favoriteRadioAtom = atom<Radio[]>([]);
export const radioStationSizeAtom = atom<"sm" | "lg">("lg");
export const customFrequencyAreaAtom = atom<
	{ id: string; type: RadioType; freq: number }[]
>([]);
/** 選局アニメーション中に表示する周波数。null = アニメーションなし */
export const tuningFreqAtom = atom<number | null>(null);
