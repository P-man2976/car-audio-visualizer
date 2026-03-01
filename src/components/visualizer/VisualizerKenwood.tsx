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
/** Number of actual frequency bands from the analyzer. */
const FREQ_COUNT = 11;

const CELL_HEIGHT = 0.6;
const COL_CELL_COUNT = 26;
const COL_CELL_GAP = 0.8;
const ANALYZER_ANGLE_DEGREE = 20;

/** Each main bar is drawn as two thin sub-columns side by side. */
const SUB_COL_WIDTH = 3.6;
/** Gap between the two sub-columns within one main bar. */
const SUB_COL_GAP = 0.5;
/** Total visual width of one main bar (2 sub-cols + internal gap). */
const MAIN_BAR_WIDTH = SUB_COL_WIDTH * 2 + SUB_COL_GAP; // 5.5

/** Width of the narrow inverted side bar flanking each main bar. */
const SIDE_BAR_WIDTH = 0.6;
/** Gap between the main bar edge and its side bar. */
const SIDE_GAP = 0.5;

/** Width of one side unit (bar + gap). */
const SIDE_UNIT = SIDE_BAR_WIDTH + SIDE_GAP; // 2.0

/** Gap between adjacent frequency bands (outside the side bars). */
const BAND_GAP = 2.0;

/**
 * Horizontal stride per frequency band:
 *   [left side unit] + [main bar] + [right side unit] + [band gap]
 */
const BAND_STRIDE = SIDE_UNIT + MAIN_BAR_WIDTH + SIDE_UNIT + BAND_GAP; // 14.5

/** Total span of all bands (no trailing gap). */
const TOTAL_WIDTH = BAND_STRIDE * FREQ_COUNT - BAND_GAP; // 125.5

// ─── X-position helpers ───────────────────────────────────────────────────────
/** Center X of the left side bar for a given frequency band. */
const sideLeftCX = (fi: number) => BAND_STRIDE * fi + SIDE_BAR_WIDTH / 2;
/** Center X of the left sub-column of the main bar. */
const subLeftCX = (fi: number) => BAND_STRIDE * fi + SIDE_UNIT + SUB_COL_WIDTH / 2;
/** Center X of the right sub-column of the main bar. */
const subRightCX = (fi: number) => subLeftCX(fi) + SUB_COL_WIDTH + SUB_COL_GAP;
/** Center X of the right side bar. */
const sideRightCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + MAIN_BAR_WIDTH + SIDE_GAP + SIDE_BAR_WIDTH / 2;
/** Center X of the entire band (used for labels). */
const bandCenterCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + MAIN_BAR_WIDTH / 2;

/**
 * ANSI 1/3-octave indices (mode 6, minFreq 20) for DPX-5021M 11 bands:
 * 63, 125, 250, 500, 1k, 2k, 4k, 6.3k, 8k, 12.5k, 16k Hz
 */
const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 24, 25, 27, 28] as const;

const FREQ_ARRAY = ["62.5", "125", "250", "500", "1k", "2k", "4k", "6.3k", "8k", "12.5k", "16k"];

// ─── Y-position helper ────────────────────────────────────────────────────────
const cellY = (colIndex: number) =>
	(CELL_HEIGHT + COL_CELL_GAP) * colIndex + COL_CELL_GAP;

// ─── MainCell ─────────────────────────────────────────────────────────────────
/**
 * One frequency band rendered as two thin sub-columns.
 * freqIndex maps 1:1 to an actual analyzer band — no Math.trunc needed.
 * Lit cells: cyan. Dark cells: near-black. Peak: white.
 */
function MainCell({
	freqIndex,
	colIndex,
}: {
	freqIndex: number;
	colIndex: number;
}) {
	const color = useMemo(() => new THREE.Color(), []);
	const leftRef = useRef<MeshStandardMaterial>(null);
	const rightRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!leftRef.current || !rightRef.current) return;
		const freqLevel = store.get(spectrogramAtom)?.[BAND_INDICES[freqIndex]];
		const value = freqLevel?.value?.[0] ?? 0;
		const peak = freqLevel?.peak?.[0] ?? 0;

		const isPeak =
			(colIndex < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < colIndex + 1) ||
			(colIndex - 2 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < colIndex - 1);

		const c = color.set(
			isPeak
				? "#ffffff"
				: value * COL_CELL_COUNT > colIndex
					? "#a5f3fc"
					: "#080018",
		);

		leftRef.current.color = c;
		rightRef.current.color = c;
	});

	return (
		<>
			{/* Left sub-column */}
			<Plane
				position={[subLeftCX(freqIndex), cellY(colIndex), 0]}
				args={[SUB_COL_WIDTH, CELL_HEIGHT, 1]}
			>
				<meshStandardMaterial ref={leftRef} />
			</Plane>
			{/* Right sub-column */}
			<Plane
				position={[subRightCX(freqIndex), cellY(colIndex), 0]}
				args={[SUB_COL_WIDTH, CELL_HEIGHT, 1]}
			>
				<meshStandardMaterial ref={rightRef} />
			</Plane>
		</>
	);
}

// ─── SideCell ─────────────────────────────────────────────────────────────────
/**
 * Narrow bar placed immediately outside the main bar.
 * Inverted: lit (teal) where the main bar is UN-lit, dark where it IS lit.
 */
function SideCell({
	freqIndex,
	colIndex,
	side,
}: {
	freqIndex: number;
	colIndex: number;
	side: "left" | "right";
}) {
	const color = useMemo(() => new THREE.Color(), []);
	const meshMaterialRef = useRef<MeshStandardMaterial>(null);

	const cx = side === "left" ? sideLeftCX(freqIndex) : sideRightCX(freqIndex);

	useFrame(() => {
		if (!meshMaterialRef.current) return;
		const freqLevel = store.get(spectrogramAtom)?.[BAND_INDICES[freqIndex]];
		const value = freqLevel?.value?.[0] ?? 0;
		meshMaterialRef.current.color = color.set(
			value * COL_CELL_COUNT <= colIndex ? "#0e7490" : "#050012",
		);
	});

	return (
		<Plane
			position={[cx, cellY(colIndex), 0]}
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

	const totalHeight =
		(CELL_HEIGHT + COL_CELL_GAP) * COL_CELL_COUNT - COL_CELL_GAP;
	// scale=1.6 のため、ローカル幅×(scale/2) で原点を視覚的中央に合わせる
	const SCALE = 1.6;

	return (
		<mesh
			ref={meshRef}
			position={[-TOTAL_WIDTH * (SCALE / 2), -totalHeight * (SCALE / 2), 0]}
			scale={SCALE}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{Array.from({ length: FREQ_COUNT }).map((_, freqIndex) => (
				<Fragment key={`k-freq-${freqIndex}`}>
					{/* Left inverted side bars */}
					{Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
						<SideCell
							key={`k-left-${freqIndex}-${colIndex}`}
							freqIndex={freqIndex}
							colIndex={colIndex}
							side="left"
						/>
					))}

					{/* Main bars (2 sub-columns per frequency band) */}
					{Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
						<MainCell
							key={`k-cell-${freqIndex}-${colIndex}`}
							freqIndex={freqIndex}
							colIndex={colIndex}
						/>
					))}

					{/* Right inverted side bars */}
					{Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
						<SideCell
							key={`k-right-${freqIndex}-${colIndex}`}
							freqIndex={freqIndex}
							colIndex={colIndex}
							side="right"
						/>
					))}

					{/* Frequency label — unrotate to stay horizontal */}
					<mesh rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}>
						<Line
							points={[
								[bandCenterCX(freqIndex) - MAIN_BAR_WIDTH / 2, -2, 0],
								[bandCenterCX(freqIndex) + MAIN_BAR_WIDTH / 2, -2, 0],
							]}
							lineWidth={4}
							color="#67e8f9"
						/>
						<Text
							color="#10b981"
							fontSize={2.4}
							font="https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.woff"
							position={[bandCenterCX(freqIndex), -6, 0]}
						>
							{FREQ_ARRAY[freqIndex] ?? ""}
						</Text>
					</mesh>
				</Fragment>
			))}
		</mesh>
	);
}
