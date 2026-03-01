import { atomWithStorage } from "jotai/utils";

export type VisualizerStyle = "standard" | "dpx5021m";

export const visualizerStyleAtom = atomWithStorage<VisualizerStyle>(
	"cav-visualizer-style-v1",
	"standard",
);
