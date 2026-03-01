import { Line, Plane, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { MeshStandardMaterial } from "three";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { spectrogramAtom, store } from "./spectrogramStore";

const CELL_WIDTH = 6;
const CELL_HEIGHT = 1;
const ROW_CELL_COUNT = 18;
const COL_CELL_COUNT = 32;
const ROW_CELL_GAP = 2;
const COL_CELL_GAP = 0.6;
const ANALYZER_ANGLE_DEGREE = 24;

const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 25, 28] as const;
const FREQ_ARRAY = ["60", "120", "250", "500", "1k", "2k", "4k", "8k", "16k"];

export function VisualizerStandard() {
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);

	useFrame(() => {
		store.set(
			spectrogramAtom,
			audioMotionAnalyzer.getBars() as AnalyzerBarData[],
		);
	});

	return (
		<group
			position={[
				-(
					((CELL_WIDTH + ROW_CELL_GAP) * ROW_CELL_COUNT - ROW_CELL_GAP + 80) /
					2
				),
				-(((CELL_HEIGHT + COL_CELL_GAP) * COL_CELL_COUNT - COL_CELL_GAP) / 2),
				0,
			]}
			scale={1.6}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{Array.from({ length: ROW_CELL_COUNT }).map((_, rowIndex) => (
				<group key={`row-${rowIndex}`}>
					{Array.from({ length: COL_CELL_COUNT }).map((_, colIndex) => (
						<VisualizerCell
							key={`${rowIndex}-${colIndex}`}
							rowIndex={rowIndex}
							colIndex={colIndex}
						/>
					))}
					<group rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}>
						<Line
							points={[
								[
									(CELL_WIDTH + ROW_CELL_GAP) * rowIndex -
										ROW_CELL_GAP / 2 +
										(rowIndex % 2 === 0 ? 0.3 : 2),
									-2,
									0,
								],
								[
									(CELL_WIDTH + ROW_CELL_GAP) * rowIndex -
										ROW_CELL_GAP / 2 +
										CELL_WIDTH -
										(rowIndex % 2 === 0 ? 2 : 0.3),
									-2,
									0,
								],
							]}
							lineWidth={4}
							color="#67e8f9"
						/>
						<Text
							color="#10b981"
							fontSize={2.4}
							font="https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.woff"
							position={[
								(CELL_WIDTH + ROW_CELL_GAP) * rowIndex - ROW_CELL_GAP,
								-2,
								0,
							]}
						>
							{FREQ_ARRAY[(rowIndex - 1) / 2] ?? ""}
						</Text>
					</group>
				</group>
			))}
		</group>
	);
}

function VisualizerCell({
	rowIndex,
	colIndex,
}: {
	rowIndex: number;
	colIndex: number;
}) {
	const color = useMemo(() => new THREE.Color(), []);
	const matRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!matRef.current) return;
		const bars = store.get(spectrogramAtom);
		const freqLevel = bars?.[BAND_INDICES[Math.trunc(rowIndex / 2)]];
		const value = freqLevel?.value?.[0] ?? 0;
		const peak = freqLevel?.peak?.[0] ?? 0;

		const isPeak =
			(colIndex < peak * COL_CELL_COUNT &&
				peak * COL_CELL_COUNT < colIndex + 1) ||
			(colIndex - 2 < peak * COL_CELL_COUNT &&
				peak * COL_CELL_COUNT < colIndex - 1);

		matRef.current.color = color.set(
			isPeak
				? "#3b82f6"
				: value * COL_CELL_COUNT > colIndex
					? "#a5f3fc"
					: "#3b0764",
		);
	});

	return (
		<Plane
			position={[
				(CELL_WIDTH + ROW_CELL_GAP) * rowIndex + ROW_CELL_GAP,
				(CELL_HEIGHT + COL_CELL_GAP) * colIndex + COL_CELL_GAP,
				0,
			]}
			args={[CELL_WIDTH, CELL_HEIGHT]}
		>
			<meshStandardMaterial ref={matRef} />
		</Plane>
	);
}
