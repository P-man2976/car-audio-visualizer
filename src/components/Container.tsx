import { Canvas, useThree } from "@react-three/fiber";
import type { ReactNode } from "react";
import { useEffect } from "react";
import type { OrthographicCamera } from "three";

/**
 * PerspectiveCamera(FOV=120, z=50) 相当の viewport.height を
 * OrthographicCamera で再現するための基準値。
 * 2 × tan(60°) × 50 ≈ 173.2
 */
const ORTHO_VP_HEIGHT = 2 * Math.tan((60 * Math.PI) / 180) * 50;

/**
 * OrthographicCamera の zoom をコンテナ高さに連動させ、
 * 旧 PerspectiveCamera と同等のワールド単位ビューポートを維持する。
 */
function AdaptiveZoom() {
	const camera = useThree((s) => s.camera) as OrthographicCamera;
	const height = useThree((s) => s.size.height);

	useEffect(() => {
		camera.zoom = height / ORTHO_VP_HEIGHT;
		camera.updateProjectionMatrix();
	}, [camera, height]);

	return null;
}

export function Container({ children }: { children: ReactNode }) {
	return (
		<Canvas
			id="visualizer"
			frameloop="always"
			orthographic
			camera={{ position: [0, 0, 50], zoom: 6 }}
		>
			<AdaptiveZoom />
			<ambientLight color={0xffffff} intensity={Math.PI / 2} />
			{children}
		</Canvas>
	);
}
