import { Container } from "../components/Container";
import { ControlsOverlay } from "../components/ControlsOverlay";
import { VisualizerSwitch } from "../components/Visualizer";

export function HomePage() {
	return (
		<div className="relative h-dvh min-h-160 overflow-hidden border border-divider bg-black/90">
			<Container>
				<VisualizerSwitch />
			</Container>
			<ControlsOverlay />
		</div>
	);
}
