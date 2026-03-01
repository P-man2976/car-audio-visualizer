import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";

export function Container({ children }: { children: ReactNode }) {
	return (
		<Canvas
			id="visualizer"
			frameloop="always"
			camera={{ fov: 120, position: [0, 0, 50] }}
			onCreated={({ gl }) => {
				const canvas = gl.domElement;
				// threejs WebGL context (already created by R3F)
				const rawCtx = gl.getContext();
				const loseCtxExt = rawCtx.getExtension("WEBGL_lose_context");

				// Attempt context restoration when the WebGL context is lost.
				// This can happen when reloading the page while audio is playing,
				// because the AudioMotionAnalyzer RAF races with the WebGL teardown.
				canvas.addEventListener("webglcontextlost", (e) => {
					e.preventDefault();
					setTimeout(() => {
						if (loseCtxExt) {
							loseCtxExt.restoreContext();
						} else {
							// Fallback: force a full page reload if restore isn't available
							window.location.reload();
						}
					}, 200);
				});
			}}
		>
			<ambientLight color={0xffffff} intensity={Math.PI / 2} />
			{children}
		</Canvas>
	);
}
