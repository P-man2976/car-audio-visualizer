import { Line, Plane, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { atom, getDefaultStore, useAtomValue } from "jotai";
import { Fragment, useEffect, useMemo, useRef } from "react";
import type { MeshStandardMaterial } from "three";
import * as THREE from "three";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { isPlayingAtom } from "@/atoms/player";
import { visualizerStyleAtom } from "@/atoms/visualizer";

const spectrogramAtom = atom<AnalyzerBarData[] | null>(null);
const store = getDefaultStore();

const CELL_WIDTH = 6;
const CELL_HEIGHT = 1;
const ROW_CELL_COUNT = 18;
const COL_CELL_COUNT = 32;
const ROW_CELL_GAP = 2;
const COL_CELL_GAP = 0.6;

const FREQ_ARRAY = ["60", "120", "250", "500", "1k", "2k", "4k", "8k", "16k"];

const ANALYZER_ANGLE_DEGREE = 24;

export function Visualizer() {
	const meshRef = useRef<THREE.Mesh>(null);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const { invalidate } = useThree();

	// isPlaying が true になった瞬間に最初のフレームをキックして
	// useFrame の自己スケジュールループを始動させる
	useEffect(() => {
		if (isPlaying) invalidate();
	}, [isPlaying, invalidate]);

	useFrame(({ invalidate: inv }) => {
		store.set(
			spectrogramAtom,
			audioMotionAnalyzer.getBars() as AnalyzerBarData[],
		);
		// demand モードで再生中は次フレームを自己スケジュール → 60fps 連続描画
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
				<Fragment key={`freq-${rowIndex}`}>
					{Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
						<VisualizerCell
							key={`cell-${rowIndex}-${colIndex}`}
							rowIndex={rowIndex}
							colIndex={colIndex}
						/>
					))}
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

function VisualizerCell({
	rowIndex,
	colIndex,
}: {
	rowIndex: number;
	colIndex: number;
}) {
	const color = useMemo(() => new THREE.Color(), []);
	const meshMaterialRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!meshMaterialRef.current) {
			return;
		}

		const freqLevel = store.get(spectrogramAtom)?.[Math.trunc(rowIndex / 2)];
		const value = freqLevel?.value?.[0] ?? 0;
		const peak = freqLevel?.peak?.[0] ?? 0;

		meshMaterialRef.current.color = color.set(
			value * 32 > colIndex ? "#a5f3fc" : "#3b0764",
		);

		if (
			(colIndex < peak * 32 && peak * 32 < colIndex + 1) ||
			(colIndex - 2 < peak * 32 && peak * 32 < colIndex - 1)
		) {
			meshMaterialRef.current.color = color.set("#3b82f6");
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

// ─── Kenwood style ────────────────────────────────────────────────────────────

// Side-panel constants
const K_SIDE_CELL_W = 3; // narrower than main (CELL_WIDTH=6)
const K_SIDE_STEP = 4; // K_SIDE_CELL_W + 1 gap
const K_SIDE_MARGIN = 8; // gap between main bars edge and side panel
const K_SIDE_BAND_COUNT = 4; // visual columns per side panel

// Innermost (closest to main) center-x for each panel
// Main left edge = ROW_CELL_GAP = 2
const K_LEFT_INNER_X = ROW_CELL_GAP - K_SIDE_MARGIN - K_SIDE_CELL_W / 2; // = -7.5
// Main right edge = (CELL_WIDTH + ROW_CELL_GAP) * ROW_CELL_COUNT = 144
const K_RIGHT_INNER_X =
	(CELL_WIDTH + ROW_CELL_GAP) * ROW_CELL_COUNT +
	K_SIDE_MARGIN +
	K_SIDE_CELL_W / 2; // = 153.5

/** Same as VisualizerCell but with white peak indicator and near-black background */
function VisualizerCellKenwood({
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
			value * 32 > colIndex ? "#a5f3fc" : "#080018",
		);

		if (
			(colIndex < peak * 32 && peak * 32 < colIndex + 1) ||
			(colIndex - 2 < peak * 32 && peak * 32 < colIndex - 1)
		) {
			// White peak bar
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

/**
 * Inverted side-panel cell.
 * Lights up dim-cyan where the corresponding main bar is UN-lit (above the signal).
 */
function KenwoodSideCell({
	bandIndex,
	colIndex,
	centerX,
}: {
	bandIndex: number;
	colIndex: number;
	centerX: number;
}) {
	const color = useMemo(() => new THREE.Color(), []);
	const meshMaterialRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!meshMaterialRef.current) return;
		const freqLevel = store.get(spectrogramAtom)?.[bandIndex];
		const value = freqLevel?.value?.[0] ?? 0;
		// Inverted: lit where main is dark (above signal level)
		const isInvLit = value * 32 <= colIndex;
		meshMaterialRef.current.color = color.set(
			isInvLit ? "#155e75" : "#050012",
		);
	});

	return (
		<Plane
			position={[centerX, (CELL_HEIGHT + COL_CELL_GAP) * colIndex + COL_CELL_GAP, 0]}
			args={[K_SIDE_CELL_W, CELL_HEIGHT, 1]}
		>
			<meshStandardMaterial ref={meshMaterialRef} />
		</Plane>
	);
}

function VisualizerKenwood() {
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
			{/* Main bars */}
			{Array.from({ length: ROW_CELL_COUNT }).map((_, rowIndex) => (
				<Fragment key={`k-freq-${rowIndex}`}>
					{Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
						<VisualizerCellKenwood
							key={`k-cell-${rowIndex}-${colIndex}`}
							rowIndex={rowIndex}
							colIndex={colIndex}
						/>
					))}
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

			{/* Left inverted side panel (bands 0-3, outermost col = lowest freq) */}
			{Array.from({ length: K_SIDE_BAND_COUNT }).map((_, sideCol) => {
				// sideCol 0 = outermost (leftmost), sideCol 3 = innermost (closest to main)
				const centerX = K_LEFT_INNER_X - (K_SIDE_BAND_COUNT - 1 - sideCol) * K_SIDE_STEP;
				const bandIndex = sideCol; // 0,1,2,3 → low-freq bands
				return Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
					<KenwoodSideCell
						key={`k-left-${sideCol}-${colIndex}`}
						bandIndex={bandIndex}
						colIndex={colIndex}
						centerX={centerX}
					/>
				));
			})}

			{/* Right inverted side panel (bands 8-5, innermost col = highest freq) */}
			{Array.from({ length: K_SIDE_BAND_COUNT }).map((_, sideCol) => {
				// sideCol 0 = innermost, sideCol 3 = outermost
				const centerX = K_RIGHT_INNER_X + sideCol * K_SIDE_STEP;
				const bandIndex = 8 - sideCol; // 8,7,6,5 → high-freq bands
				return Array.from({ length: COL_CELL_COUNT }).map((__, colIndex) => (
					<KenwoodSideCell
						key={`k-right-${sideCol}-${colIndex}`}
						bandIndex={bandIndex}
						colIndex={colIndex}
						centerX={centerX}
					/>
				));
			})}
		</mesh>
	);
}

/** Renders the active visualizer style. Use this in place of <Visualizer /> */
export function VisualizerSwitch() {
	const style = useAtomValue(visualizerStyleAtom);
	return style === "kenwood" ? <VisualizerKenwood /> : <Visualizer />;
}
