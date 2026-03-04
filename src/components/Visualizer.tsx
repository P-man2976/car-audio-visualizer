import { useAtomValue } from "jotai";
import { visualizerStyleAtom } from "@/atoms/visualizer";
import { useResponsiveScale } from "@/hooks/useResponsiveScale";
import { DotMatrixArray } from "./DotMatrix";
import { VisualizerKenwood } from "./visualizer/VisualizerKenwood";
import { VisualizerKenwoodSub } from "./visualizer/VisualizerKenwoodSub";
import { VisualizerStandard } from "./visualizer/VisualizerStandard";

/**
 * Renders the active visualizer style and positions DotMatrix accordingly.
 * ビューポート幅に応じてシーン全体をレスポンシブスケーリングする。
 *   standard     → 3D InstancedMesh + DotMatrix at top (y=40)
 *   dpx5021m     → main + sub + DotMatrix at bottom (y=-43)
 *   standard-2d  → HomePage で PixiJS によりレンダー（R3F 外）
 */
export function VisualizerSwitch() {
	const style = useAtomValue(visualizerStyleAtom);
	const scale = useResponsiveScale();

	if (style === "dpx5021m") {
		return (
			<group scale={scale}>
				<VisualizerKenwood />
				<VisualizerKenwoodSub />
				<DotMatrixArray y={-43} />
			</group>
		);
	}

	return (
		<group scale={scale}>
			<VisualizerStandard />
			<DotMatrixArray y={40} />
		</group>
	);
}
