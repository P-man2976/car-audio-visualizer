import { atom } from "jotai";
import { DEFAULT_BAR_COUNT } from "../lib/visualizer";

export const barLevelsAtom = atom<number[]>(Array.from({ length: DEFAULT_BAR_COUNT }, () => 0));
