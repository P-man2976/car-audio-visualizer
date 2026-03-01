import { Line, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { isPlayingAtom } from "@/atoms/player";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL_WIDTH = 6;
const CELL_HEIGHT = 1;
const ROW_CELL_COUNT = 18;
const COL_CELL_COUNT = 32;
const ROW_CELL_GAP = 2;
const COL_CELL_GAP = 0.6;
const ANALYZER_ANGLE_DEGREE = 24;

/**
 * ANSI 1/3-octave indices (mode 6, minFreq 20) for 9 octave bands:
 * 63, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz
 */
const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 25, 28] as const;

const FREQ_ARRAY = ["60", "120", "250", "500", "1k", "2k", "4k", "8k", "16k"];

// Total cell instances: 18 rows × 32 cols = 576
const CELL_COUNT = ROW_CELL_COUNT * COL_CELL_COUNT;

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerStandard() {
	const meshRef = useRef<THREE.Mesh>(null);
	const cellsRef = useRef<THREE.InstancedMesh>(null);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const { invalidate } = useThree();

	// ── One-time matrix initialization ────────────────────────────────────────
	useEffect(() => {
		const cells = cellsRef.current;
		if (!cells) return;

		const d = new THREE.Object3D();
		d.scale.set(CELL_WIDTH, CELL_HEIGHT, 1);

		for (let ri = 0; ri < ROW_CELL_COUNT; ri++) {
			for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
				d.position.set(
					(CELL_WIDTH + ROW_CELL_GAP) * ri + ROW_CELL_GAP,
					(CELL_HEIGHT + COL_CELL_GAP) * ci + COL_CELL_GAP,
					0,
				);
				d.updateMatrix();
				cells.setMatrixAt(ri * COL_CELL_COUNT + ci, d.matrix);
			}
		}

		cells.instanceMatrix.needsUpdate = true;
	}, []);

	// isPlaying が true になった瞬間に最初のフレームをキックして
	// useFrame の自己スケジュールループを始動させる
	useEffect(() => {
		if (isPlaying) invalidate();
	}, [isPlaying, invalidate]);

	// ── Per-frame color update (single callback for all 576 cells) ────────────
	const _c = useRef(new THREE.Color());

	useFrame(({ invalidate: inv }) => {
		const bars = audioMotionAnalyzer.getBars() as AnalyzerBarData[];
		store.set(spectrogramAtom, bars);

		const cells = cellsRef.current;
		if (!cells) {
			if (isPlaying) inv();
			return;
		}

		const c = _c.current;

		for (let ri = 0; ri < ROW_CELL_COUNT; ri++) {
			const freqLevel = bars[BAND_INDICES[Math.trunc(ri / 2)]];
			const value = freqLevel?.value?.[0] ?? 0;
			const peak = freqLevel?.peak?.[0] ?? 0;

			for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
				const isPeak =
					(ci < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci + 1) ||
					(ci - 2 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci - 1);

				c.set(
					isPeak
						? "#3b82f6"
						: value * COL_CELL_COUNT > ci
							? "#a5f3fc"
							: "#3b0764",
				);
				cells.setColorAt(ri * COL_CELL_COUNT + ci, c);
			}
		}

		if (cells.instanceColor) cells.instanceColor.needsUpdate = true;

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
			{/* All cells as a single InstancedMesh — 576 instances, 1 draw call */}
			<instancedMesh ref={cellsRef} args={[undefined, undefined, CELL_COUNT]}>
				<planeGeometry args={[1, 1]} />
				<meshBasicMaterial vertexColors />
			</instancedMesh>

			{/* Frequency labels (18 meshes — no optimization needed) */}
			{Array.from({ length: ROW_CELL_COUNT }).map((_, rowIndex) => (
				<mesh
					key={`freq-${rowIndex}`}
					rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}
				>
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
			))}
		</mesh>
	);
}
