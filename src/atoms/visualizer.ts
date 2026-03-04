import { atomWithStorage } from "jotai/utils";

export type VisualizerStyle = "standard" | "dpx5021m" | "standard-2d";

export const visualizerStyleAtom = atomWithStorage<VisualizerStyle>(
	"cav-visualizer-style-v1",
	"standard",
);
