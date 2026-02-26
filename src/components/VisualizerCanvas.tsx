import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { useAtomValue, useSetAtom } from "jotai";
import { useMemo } from "react";
import { audioMotionAnalyzerAtom } from "../atoms/audio";
import { barLevelsAtom } from "../atoms/visualizer";
import { DEFAULT_BAR_COUNT, toBarLevels } from "../lib/visualizer";

function AnalyzerUpdater({ enabled }: { enabled: boolean }) {
	const analyzer = useAtomValue(audioMotionAnalyzerAtom);
	const setBarLevels = useSetAtom(barLevelsAtom);

	useFrame(() => {
		if (!enabled) {
			setBarLevels(Array.from({ length: DEFAULT_BAR_COUNT }, () => 0));
			return;
		}

		const bars = analyzer.getBars() as Array<{ value?: number[] }>;
		setBarLevels(toBarLevels(bars, DEFAULT_BAR_COUNT));
	});

	return null;
}

function SpectrumBars() {
	const levels = useAtomValue(barLevelsAtom);

	const bars = useMemo(
		() =>
			levels.map((level, index) => {
				const x = index - levels.length / 2;
				const height = 0.35 + level * 10;
				const hue = 0.56 - level * 0.48;
				const color = `hsl(${Math.round(hue * 360)} 95% 60%)`;

				return {
					key: `bar-${index}`,
					x,
					height,
					color,
				};
			}),
		[levels],
	);

	return (
		<>
			{bars.map((bar) => (
				<mesh key={bar.key} position={[bar.x, bar.height / 2, 0]}>
					<boxGeometry args={[0.7, bar.height, 0.8]} />
					<meshStandardMaterial color={bar.color} />
				</mesh>
			))}
		</>
	);
}

export function VisualizerCanvas({ enabled }: { enabled: boolean }) {
	return (
		<div className="h-[360px] w-full overflow-hidden rounded-xl border border-divider">
			<Canvas camera={{ position: [0, 11, 22], fov: 42 }}>
				<color attach="background" args={["#020617"]} />
				<ambientLight intensity={0.45} />
				<pointLight position={[0, 12, 12]} intensity={1.3} color="#67e8f9" />
				<pointLight position={[0, 6, -8]} intensity={0.4} color="#a78bfa" />
				<SpectrumBars />
				<AnalyzerUpdater enabled={enabled} />
			</Canvas>
		</div>
	);
}
