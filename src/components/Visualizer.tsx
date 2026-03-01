import { useAtomValue } from "jotai";
import { visualizerStyleAtom } from "@/atoms/visualizer";
import { VisualizerStandard } from "./visualizer/VisualizerStandard";
import { VisualizerKenwood } from "./visualizer/VisualizerKenwood";

/** Renders the active visualizer style based on visualizerStyleAtom. */
export function VisualizerSwitch() {
	const style = useAtomValue(visualizerStyleAtom);
	return style === "kenwood" ? <VisualizerKenwood /> : <VisualizerStandard />;
}
