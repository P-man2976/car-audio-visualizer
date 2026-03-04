import { Container } from "../components/Container";
import { ControlsOverlay } from "../components/ControlsOverlay";
import { VisualizerSwitch } from "../components/Visualizer";
import { usePinchZoom } from "../hooks/usePinchZoom";

export function HomePage() {
	const pinchRef = usePinchZoom();

	return (
		<div className="relative h-dvh overflow-hidden border border-divider bg-black/90">
			<div ref={pinchRef} className="h-full w-full">
				<Container>
					<VisualizerSwitch />
				</Container>
			</div>
			<ControlsOverlay />
		</div>
	);
}
