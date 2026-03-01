import { Line, Plane, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { Fragment, useEffect, useMemo, useRef } from "react";
import type { MeshStandardMaterial } from "three";
import * as THREE from "three";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { isPlayingAtom } from "@/atoms/player";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL_WIDTH = ５;
const CELL_HEIGHT = 1;
const ROW_CELL_COUNT = 18;
const COL_CELL_COUNT = 32;
const ROW_CELL_GAP = 2;
const COL_CELL_GAP = 0.6;
const ANALYZER_ANGLE_DEGREE = 24;

/** Width of the narrow inverted side bar flanking each main bar.
 *  Must fit within ROW_CELL_GAP (=2) on each side. */
const SIDE_BAR_WIDTH = 1.0;

const FREQ_ARRAY = ["60", "120", "250", "500", "1k", "2k", "4k", "8k", "16k"];

// ─── Main cell ────────────────────────────────────────────────────────────────
/** Same grid as standard, but with a near-black background and white peak bar. */
function MainCell({
	rowIndex,
	colIndex,
}: {
	rowIndex: number;
	colIndex: number;
}) {
	const color = useMemo(() => new THREE.Color(), []);
	const meshMaterialRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!meshMaterialRef.current) return;
		const freqLevel = store.get(spectrogramAtom)?.[Math.trunc(rowIndex / 2)];
		const value = freqLevel?.value?.[0] ?? 0;
		const peak = freqLevel?.peak?.[0] ?? 0;

		meshMaterialRef.current.color = color.set(
			value * COL_CELL_COUNT > colIndex ? "#a5f3fc" : "#080018",
		);

		if (
			(colIndex < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < colIndex + 1) ||
			(colIndex - 2 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < colIndex - 1)
		) {
			// White peak indicator
			meshMaterialRef.current.color = color.set("#ffffff");
		}
	});

	return (
		<Plane
			position={[
				(CELL_WIDTH + ROW_CELL_GAP) * rowIndex + ROW_CELL_GAP,
				(CELL_HEIGHT + COL_CELL_GAP) * colIndex + COL_CELL_GAP,
				0,
			]}
			args={[CELL_WIDTH, CELL_HEIGHT, 1]}
		>
			<meshStandardMaterial ref={meshMaterialRef} />
		</Plane>
	);
}

// ─── Side cell ────────────────────────────────────────────────────────────────
/**
 * Narrow bar placed immediately to the left or right of a main bar.
 * Inverted: lit (dim-cyan) where the main bar is UN-lit (above signal level),
 * dark where the main bar is lit.
 */
function SideCell({
	rowIndex,
	colIndex,
	side,
}: {
	rowIndex: number;
	colIndex: number;
	side: "left" | "right";
}) {
	const color = useMemo(() => new THREE.Color(), []);
	const meshMaterialRef = useRef<MeshStandardMaterial>(null);

	const mainCenterX = (CELL_WIDTH + ROW_CELL_GAP) * rowIndex + ROW_CELL_GAP;
	const sideCenterX =
		side === "left"
			? mainCenterX - CELL_WIDTH / 2 - SIDE_BAR_WIDTH / 2
			: mainCenterX + CELL_WIDTH / 2 + SIDE_BAR_WIDTH / 2;

	useFrame(() => {
		if (!meshMaterialRef.current) return;
		const freqLevel = store.get(spectrogramAtom)?.[Math.trunc(rowIndex / 2)];
		const value = freqLevel?.value?.[0] ?? 0;
		// Inverted: lit where main is dark (colIndex is above the signal level)
		meshMaterialRef.current.color = color.set(
			value * COL_CELL_COUNT <= colIndex ? "#0e7490" : "#050012",
		);
	});

	return (
		<Plane
			position={[
				sideCenterX,
				(CELL_HEIGHT + COL_CELL_GAP) * colIndex + COL_CELL_GAP,
				0,
			]}
			args={[SIDE_BAR_WIDTH, CELL_HEIGHT, 1]}
		>
			<meshStandardMaterial ref={meshMaterialRef} />
		</Plane>
	);
}

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerKenwood() {
	const meshRef = useRef<THREE.Mesh>(null);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const { invalidate } = useThree();

	useEffect(() => {
		if (isPlaying) invalidate();
	}, [isPlaying, invalidate]);

	useFrame(({ invalidate: inv }) => {
		store.set(
			spectrogramAtom,
			audioMotionAnalyzer.getBars() as AnalyzerBarData[],
		);
		if (isPlaying) inv();
	});

	return (
		<mesh
			ref={meshRef}
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
				<Fragment key={`k-freq-${rowIndex}`}>
					{/* Left inverted side bar */}
					{Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
						<SideCell
							key={`k-left-${rowIndex}-${colIndex}`}
							rowIndex={rowIndex}
							colIndex={colIndex}
							side="left"
						/>
					))}
					{/* Main bar */}
					{Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
						<MainCell
							key={`k-cell-${rowIndex}-${colIndex}`}
							rowIndex={rowIndex}
							colIndex={colIndex}
						/>
					))}
					{/* Right inverted side bar */}
					{Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
						<SideCell
							key={`k-right-${rowIndex}-${colIndex}`}
							rowIndex={rowIndex}
							colIndex={colIndex}
							side="right"
						/>
					))}
					{/* Frequency label line */}
					<mesh rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}>
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
					</mesh>
				</Fragment>
			))}
		</mesh>
	);
}
