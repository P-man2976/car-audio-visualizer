import { useAtomValue } from "jotai";
import { visualizerStyleAtom } from "@/atoms/visualizer";
import { useAmFilter } from "@/hooks/useAmFilter";
import { useAudioMotionSettings } from "@/hooks/useAudioMotionSettings";
import { Container } from "../components/Container";
import { ControlsOverlay } from "../components/ControlsOverlay";
import { VisualizerSwitch } from "../components/Visualizer";
import { VisualizerCanvas2D } from "../components/visualizer/VisualizerCanvas2D";

export function HomePage() {
	const style = useAtomValue(visualizerStyleAtom);
	// audioMotionSettingsAtom の変化を audioMotionAnalyzer にリアルタイム反映する
	useAudioMotionSettings();
	// AM ラジオ再生時にローパスフィルタを自動適用する
	useAmFilter();

	return (
		<div className="relative h-full overflow-hidden border border-divider bg-black/90">
			{style === "standard-2d" ? (
				<VisualizerCanvas2D />
			) : (
				<Container>
					<VisualizerSwitch />
				</Container>
			)}
			<ControlsOverlay />
		</div>
	);
}
