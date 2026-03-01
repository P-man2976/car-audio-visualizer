import { useAtomValue } from "jotai";
import { visualizerStyleAtom } from "@/atoms/visualizer";
import { DotMatrixArray } from "./DotMatrix";
import { VisualizerKenwood } from "./visualizer/VisualizerKenwood";
import { VisualizerKenwoodSub } from "./visualizer/VisualizerKenwoodSub";
import { VisualizerStandard } from "./visualizer/VisualizerStandard";

/**
 * Renders the active visualizer style and positions DotMatrix accordingly.
 *   standard  → DotMatrix at top (y=40)
 *   dpx5021m  → main + sub + DotMatrix at bottom (y=-55)
 */
export function VisualizerSwitch() {
	const style = useAtomValue(visualizerStyleAtom);

	if (style === "dpx5021m") {
		return (
			<>
				<VisualizerKenwood />
				<VisualizerKenwoodSub />
				<DotMatrixArray y={-55} />
			</>
		);
	}

	return (
		<>
			<VisualizerStandard />
			<DotMatrixArray y={40} />
		</>
	);
}
