import { Container } from "../components/Container";
import { ControlsOverlay } from "../components/ControlsOverlay";
import { DotMatrixArray } from "../components/DotMatrix";
import { Visualizer } from "../components/Visualizer";

export function HomePage() {
	return (
		<div className="relative h-[calc(100svh-2rem)] min-h-[640px] overflow-hidden rounded-xl border border-divider bg-black/90">
			<Container>
				<DotMatrixArray />
				<Visualizer />
			</Container>
			<ControlsOverlay />
		</div>
	);
}
