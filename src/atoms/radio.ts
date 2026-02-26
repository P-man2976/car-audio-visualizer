import { atom } from "jotai";
import type { Radio } from "../types/radio";

export const currentRadioAtom = atom<Radio | null>(null);
export const favoriteRadioAtom = atom<Radio[]>([]);
export const radioStationSizeAtom = atom<"sm" | "lg">("lg");
