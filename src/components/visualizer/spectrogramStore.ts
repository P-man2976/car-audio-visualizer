import type { AnalyzerBarData } from "audiomotion-analyzer";
import { atom, getDefaultStore } from "jotai";

/** Shared spectrogram data atom updated every frame by the active visualizer. */
export const spectrogramAtom = atom<AnalyzerBarData[] | null>(null);

/** Global Jotai store used for direct get/set inside useFrame callbacks. */
export const store = getDefaultStore();
