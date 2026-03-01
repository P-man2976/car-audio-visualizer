import { atomWithStorage } from "jotai/utils";

export type VisualizerStyle = "standard" | "kenwood";

export const visualizerStyleAtom = atomWithStorage<VisualizerStyle>(
	"cav-visualizer-style-v1",
	"standard",
);
