import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";

export function Container({ children }: { children: ReactNode }) {
	return (
		<Canvas frameloop="demand" camera={{ fov: 120, position: [0, 0, 50] }}>
			<ambientLight color={0xffffff} intensity={Math.PI / 2} />
			{children}
		</Canvas>
	);
}
