import { useFrame } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const FREQ_COUNT = 11;
const CELL_HEIGHT = 0.6;
const COL_CELL_COUNT = 26;
const COL_CELL_GAP = 0.8;
const ANALYZER_ANGLE_DEGREE = 16;

const SUB_COL_WIDTH = 3;
const SUB_COL_GAP = 0.5;
// MAIN_BAR_WIDTH is derived from SUB_COL_WIDTH so they stay in sync:
//   left bar + gap + right bar  (e.g. 3.4 + 0.5 + 3.4 = 7.3)
const MAIN_BAR_WIDTH = SUB_COL_WIDTH * 2 + SUB_COL_GAP;
const SIDE_BAR_WIDTH = 0.4;
const SIDE_GAP = 0.5;
const SIDE_UNIT = SIDE_BAR_WIDTH + SIDE_GAP; // 1.1
const BAND_GAP = 1.6;
const BAND_STRIDE =
	SIDE_UNIT + MAIN_BAR_WIDTH + SIDE_GAP + SIDE_BAR_WIDTH + BAND_GAP;
const TOTAL_WIDTH = BAND_STRIDE * FREQ_COUNT;

/**
 * ANSI 1/3-octave indices for 11 bands:
 * 63, 125, 250, 500, 1k, 2k, 4k, 6k, 8k, 12k, 16k Hz
 */
const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 24, 25, 27, 28] as const;

// ─── Position helpers ─────────────────────────────────────────────────────────
const sideLeftCX = (fi: number) => BAND_STRIDE * fi + SIDE_BAR_WIDTH / 2;
const subLeftCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + SUB_COL_WIDTH / 2;
const subRightCX = (fi: number) => subLeftCX(fi) + SUB_COL_WIDTH + SUB_COL_GAP;
const sideRightCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + MAIN_BAR_WIDTH + SIDE_GAP + SIDE_BAR_WIDTH / 2;
const cellY = (ci: number) => (CELL_HEIGHT + COL_CELL_GAP) * ci + COL_CELL_GAP;

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerKenwood() {
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);

	useFrame(() => {
		// Safari/WebKit: isOn=false 時（start() 未呼び出し）はスキップ
		if (!audioMotionAnalyzer.isOn) return;
		store.set(
			spectrogramAtom,
			audioMotionAnalyzer.getBars() as AnalyzerBarData[],
		);
	});

	const totalHeight =
		(CELL_HEIGHT + COL_CELL_GAP) * COL_CELL_COUNT - COL_CELL_GAP;
	const SCALE = 1.8;
	const OFFSET_Y = 24;

	return (
		<group
			position={[
				-TOTAL_WIDTH * (SCALE / 2),
				-totalHeight * (SCALE / 2) + OFFSET_Y,
				0,
			]}
			scale={SCALE}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => (
				<group key={`band-${fi}`}>
					<KenwoodMainBandInstanced fi={fi} />
					<KenwoodSideBandInstanced fi={fi} />
				</group>
			))}
		</group>
	);
}

// ─── Shared geometries ────────────────────────────────────────────────────────
const mainGeometry = new THREE.PlaneGeometry(SUB_COL_WIDTH, CELL_HEIGHT);
const sideGeometry = new THREE.PlaneGeometry(SIDE_BAR_WIDTH, CELL_HEIGHT);
const INSTANCES_PER_BAND = COL_CELL_COUNT * 2;

// ─── Main sub-bar InstancedMesh (left + right, cyan when lit) ─────────────────
function KenwoodMainBandInstanced({ fi }: { fi: number }) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const color = useMemo(() => new THREE.Color(), []);

	useEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const mat = new THREE.Matrix4();
		const dark = new THREE.Color("#3b0764");
		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			const y = cellY(ci);
			mat.makeTranslation(subLeftCX(fi), y, 0);
			mesh.setMatrixAt(ci * 2, mat);
			mesh.setColorAt(ci * 2, dark);
			mat.makeTranslation(subRightCX(fi), y, 0);
			mesh.setMatrixAt(ci * 2 + 1, mat);
			mesh.setColorAt(ci * 2 + 1, dark);
		}
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	}, [fi]);

	useFrame(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const bars = store.get(spectrogramAtom);
		const freqLevel = bars?.[BAND_INDICES[fi]];
		const value = freqLevel?.value?.[0] ?? 0;
		const peak = freqLevel?.peak?.[0] ?? 0;

		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			const isPeak =
				(ci < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci + 1) ||
				(ci - 1 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci);

			color.set(
				isPeak
					? "#ffffff"
					: value * COL_CELL_COUNT > ci
						? "#6dceff"
						: "#3b0764",
			);
			mesh.setColorAt(ci * 2, color);
			mesh.setColorAt(ci * 2 + 1, color);
		}
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	});

	return (
		<instancedMesh
			ref={meshRef}
			args={[mainGeometry, undefined, INSTANCES_PER_BAND]}
		>
			<meshStandardMaterial />
		</instancedMesh>
	);
}

// ─── Side tick InstancedMesh (left + right, inverted: unlit = cyan) ───────────
function KenwoodSideBandInstanced({ fi }: { fi: number }) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const color = useMemo(() => new THREE.Color(), []);

	useEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const mat = new THREE.Matrix4();
		const cyan = new THREE.Color("#91daff");
		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			const y = cellY(ci);
			mat.makeTranslation(sideLeftCX(fi), y, 0);
			mesh.setMatrixAt(ci * 2, mat);
			mesh.setColorAt(ci * 2, cyan);
			mat.makeTranslation(sideRightCX(fi), y, 0);
			mesh.setMatrixAt(ci * 2 + 1, mat);
			mesh.setColorAt(ci * 2 + 1, cyan);
		}
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	}, [fi]);

	useFrame(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const bars = store.get(spectrogramAtom);
		const freqLevel = bars?.[BAND_INDICES[fi]];
		const value = freqLevel?.value?.[0] ?? 0;

		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			// inverted: below signal level = dark, above = cyan
			color.set(value * COL_CELL_COUNT > ci ? "#3b0764" : "#91daff");
			mesh.setColorAt(ci * 2, color);
			mesh.setColorAt(ci * 2 + 1, color);
		}
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	});

	return (
		<instancedMesh
			ref={meshRef}
			args={[sideGeometry, undefined, INSTANCES_PER_BAND]}
		>
			<meshStandardMaterial />
		</instancedMesh>
	);
}
