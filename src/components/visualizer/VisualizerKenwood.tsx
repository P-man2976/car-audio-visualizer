import { Line, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { Fragment, useEffect, useRef } from "react";
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
 * 1/3-octave ANSI band indices that correspond to the DPX-5021M's 11 EQ bands.
 * With mode:6 + ansiBands:true + minFreq:20, getBars() returns ~31 bands
 * starting at 20 Hz. Index mapping: 20,25,31.5,40,50,63,80,100,125,...
 */
const BAND_INDICES = [5, 8, 11, 14, 17, 20, 23, 25, 26, 28, 29] as const;
const FREQ_ARRAY = ["63", "125", "250", "500", "1k", "2k", "4k", "6.3k", "8k", "12.5k", "16k"];

// ─── Y-position helper ────────────────────────────────────────────────────────
const cellY = (colIndex: number) =>
	(CELL_HEIGHT + COL_CELL_GAP) * colIndex + COL_CELL_GAP;

// ─── InstancedMesh counts ─────────────────────────────────────────────────────
// main: FREQ_COUNT × COL_CELL_COUNT × 2 sub-cols    = 572
// side: FREQ_COUNT × COL_CELL_COUNT × 2 (left+right)= 572
const MAIN_INST = FREQ_COUNT * COL_CELL_COUNT * 2;
const SIDE_INST = FREQ_COUNT * COL_CELL_COUNT * 2;

// Reusable scratch objects (never re-allocated during render)
const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion(); // identity
const _scl = new THREE.Vector3(1, 1, 1);
const _cMain = new THREE.Color();
const _cSide = new THREE.Color();

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerKenwood() {
	const mainRef = useRef<THREE.InstancedMesh>(null);
	const sideRef = useRef<THREE.InstancedMesh>(null);
	const meshRef = useRef<THREE.Mesh>(null);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const { invalidate } = useThree();

	// ── Initialize instance transforms once ──────────────────────────────────
	useEffect(() => {
		const main = mainRef.current;
		const side = sideRef.current;
		if (!main || !side) return;

		for (let fi = 0; fi < FREQ_COUNT; fi++) {
			for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
				const y = cellY(ci);
				const base = fi * COL_CELL_COUNT * 2 + ci * 2;

				// Main: left sub-col
				_pos.set(subLeftCX(fi), y, 0);
				main.setMatrixAt(base + 0, _mat.compose(_pos, _quat, _scl));

				// Main: right sub-col
				_pos.set(subRightCX(fi), y, 0);
				main.setMatrixAt(base + 1, _mat.compose(_pos, _quat, _scl));

				// Side: left
				_pos.set(sideLeftCX(fi), y, 0);
				side.setMatrixAt(base + 0, _mat.compose(_pos, _quat, _scl));

				// Side: right
				_pos.set(sideRightCX(fi), y, 0);
				side.setMatrixAt(base + 1, _mat.compose(_pos, _quat, _scl));
			}
		}
		main.instanceMatrix.needsUpdate = true;
		side.instanceMatrix.needsUpdate = true;

		if (isPlaying) invalidate();
	}, [isPlaying, invalidate]);

	// ── Frame loop: update bar data + instance colors ─────────────────────────
	useFrame(({ invalidate: inv }) => {
		const bars = audioMotionAnalyzer.getBars() as AnalyzerBarData[];
		store.set(spectrogramAtom, bars);

		const main = mainRef.current;
		const side = sideRef.current;
		if (!main || !side) {
			if (isPlaying) inv();
			return;
		}

		for (let fi = 0; fi < FREQ_COUNT; fi++) {
			const freqLevel = bars[BAND_INDICES[fi]];
			const value = freqLevel?.value?.[0] ?? 0;
			const peak = freqLevel?.peak?.[0] ?? 0;

			for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
				const base = fi * COL_CELL_COUNT * 2 + ci * 2;

				const isPeak =
					(ci < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci + 1) ||
					(ci - 2 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci - 1);

				_cMain.set(
					isPeak ? "#ffffff" : value * COL_CELL_COUNT > ci ? "#a5f3fc" : "#080018",
				);
				main.setColorAt(base + 0, _cMain);
				main.setColorAt(base + 1, _cMain);

				_cSide.set(value * COL_CELL_COUNT <= ci ? "#0e7490" : "#050012");
				side.setColorAt(base + 0, _cSide);
				side.setColorAt(base + 1, _cSide);
			}
		}

		main.instanceColor!.needsUpdate = true;
		side.instanceColor!.needsUpdate = true;

		if (isPlaying) inv();
	});

	const totalHeight = (CELL_HEIGHT + COL_CELL_GAP) * COL_CELL_COUNT - COL_CELL_GAP;
	const SCALE = 1.6;

	return (
		<mesh
			ref={meshRef}
			position={[-TOTAL_WIDTH * (SCALE / 2), -totalHeight * (SCALE / 2), 0]}
			scale={SCALE}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{/* Main bars: 2 sub-columns per band — single draw call */}
			<instancedMesh ref={mainRef} args={[undefined, undefined, MAIN_INST]}>
				<planeGeometry args={[SUB_COL_WIDTH, CELL_HEIGHT]} />
				<meshBasicMaterial vertexColors />
			</instancedMesh>

			{/* Side bars: left + right flanking bars — single draw call */}
			<instancedMesh ref={sideRef} args={[undefined, undefined, SIDE_INST]}>
				<planeGeometry args={[SIDE_BAR_WIDTH, CELL_HEIGHT]} />
				<meshBasicMaterial vertexColors />
			</instancedMesh>

			{/* Frequency labels (static, 11 text nodes) */}
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => (
				<Fragment key={`k-label-${fi}`}>
					<mesh rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}>
						<Line
							points={[
								[bandCenterCX(fi) - MAIN_BAR_WIDTH / 2, -2, 0],
								[bandCenterCX(fi) + MAIN_BAR_WIDTH / 2, -2, 0],
							]}
							lineWidth={4}
							color="#67e8f9"
						/>
						<Text
							color="#10b981"
							fontSize={2.4}
							font="https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.woff"
							position={[bandCenterCX(fi), -6, 0]}
						>
							{FREQ_ARRAY[fi] ?? ""}
						</Text>
					</mesh>
				</Fragment>
			))}
		</mesh>
	);
}

