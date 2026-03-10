import { useAtomValue } from "jotai";
import { visualizerStyleAtom } from "@/atoms/visualizer";
import { useAmFilter } from "@/hooks/useAmFilter";
import { useAudioMotionSettings } from "@/hooks/useAudioMotionSettings";
import { Container } from "../components/Container";
import { ControlsOverlay } from "../components/ControlsOverlay";
import { VisualizerSwitch } from "../components/Visualizer";
import { VisualizerCanvas2D } from "../components/visualizer/VisualizerCanvas2D";
import { VisualizerCanvas2DKenwood } from "../components/visualizer/VisualizerCanvas2DKenwood";

export function HomePage() {
	const style = useAtomValue(visualizerStyleAtom);
	// audioMotionSettingsAtom の変化を audioMotionAnalyzer にリアルタイム反映する
	useAudioMotionSettings();
	// AM ラジオ再生時にローパスフィルタを自動適用する
	useAmFilter();

	return (
		<div className="relative h-full overflow-hidden bg-black/90">
			{style === "standard-2d" ? (
				<VisualizerCanvas2D />
			) : style === "dpx5021m-2d" ? (
				<VisualizerCanvas2DKenwood />
			) : (
				<Container>
					<VisualizerSwitch />
				</Container>
			)}
			<ControlsOverlay />
		</div>
	);
}
