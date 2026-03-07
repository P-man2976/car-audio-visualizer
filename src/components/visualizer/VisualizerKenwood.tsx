import { useFrame } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import {
	animationModeAtom,
	steppedIntervalAtom,
} from "@/atoms/visualizerAnimation";
import { SteppedAnalyzer } from "@/lib/steppedAnalyzer";
import {
	createPerspParams,
	fillQuadColor,
	projectedCenterY,
	writePerspQuad,
	writeQuadIndices,
} from "@/lib/perspProject";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const FREQ_COUNT = 11;
const CELL_HEIGHT = 0.6;
const COL_CELL_COUNT = 26;
const COL_CELL_GAP = 0.8;
const ANALYZER_ANGLE_DEGREE = 28;

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

// ─── Perspective projection (台形レイアウト) ───────────────────────────────────
const GRID_CX = (sideLeftCX(0) + sideRightCX(FREQ_COUNT - 1)) / 2;
const GRID_CY = (cellY(0) + cellY(COL_CELL_COUNT - 1)) / 2;
const PERSP = createPerspParams(GRID_CX, GRID_CY, 50, ANALYZER_ANGLE_DEGREE);
/** 射影後の Y 中心 */
const PROJ_CY = projectedCenterY(cellY(0), cellY(COL_CELL_COUNT - 1), PERSP);

// ─── Cached colors ────────────────────────────────────────────────────────────
const COLOR_DARK = new THREE.Color("#3b0764");
const COLOR_LIT = new THREE.Color("#6dceff");
const COLOR_PEAK = new THREE.Color("#ffffff");
const COLOR_SIDE_OFF = new THREE.Color("#91daff");

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerKenwood() {
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const animationMode = useAtomValue(animationModeAtom);
	const steppedInterval = useAtomValue(steppedIntervalAtom);

	const steppedRef = useRef<SteppedAnalyzer | null>(null);

	useFrame(() => {
		// Safari/WebKit: isOn=false 時（start() 未呼び出し）はスキップ
		if (!audioMotionAnalyzer.isOn) return;

		if (animationMode === "stepped") {
			if (!steppedRef.current) {
				steppedRef.current = new SteppedAnalyzer(steppedInterval);
			}
			steppedRef.current.interval = steppedInterval;
			const bars = steppedRef.current.update(
				() => audioMotionAnalyzer.getBars() as AnalyzerBarData[],
				performance.now(),
			);
			if (bars) store.set(spectrogramAtom, bars);
		} else {
			steppedRef.current = null;
			store.set(
				spectrogramAtom,
				audioMotionAnalyzer.getBars() as AnalyzerBarData[],
			);
		}
	});

	const SCALE = 1.6;
	const OFFSET_Y = 20;

	return (
		<group
			position={[-GRID_CX * SCALE, -PROJ_CY * SCALE + OFFSET_Y, 0]}
			scale={SCALE}
		>
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => (
				<group key={`band-${fi}`}>
					<KenwoodMainBandMesh fi={fi} />
					<KenwoodSideBandMesh fi={fi} />
				</group>
			))}
		</group>
	);
}

// ─── Per-band BufferGeometry constants ───────────────────────────────────────
const CELLS_PER_BAND = COL_CELL_COUNT * 2;
const MAIN_HALF_W = SUB_COL_WIDTH / 2;
const SIDE_HALF_W = SIDE_BAR_WIDTH / 2;
const HALF_H = CELL_HEIGHT / 2;

// ─── Main sub-bar BufferGeometry (left + right, cyan when lit) ────────────────
function KenwoodMainBandMesh({ fi }: { fi: number }) {
	const meshRef = useRef<THREE.Mesh>(null);

	const { geometry, colorArray } = useMemo(() => {
		const geo = new THREE.BufferGeometry();
		const positions = new Float32Array(CELLS_PER_BAND * 12);
		const colors = new Float32Array(CELLS_PER_BAND * 12);
		const indices = new Uint16Array(CELLS_PER_BAND * 6);

		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			const y = cellY(ci);
			const lIdx = ci * 2;
			const rIdx = ci * 2 + 1;
			writePerspQuad(
				positions,
				lIdx,
				subLeftCX(fi),
				y,
				MAIN_HALF_W,
				HALF_H,
				PERSP,
			);
			writePerspQuad(
				positions,
				rIdx,
				subRightCX(fi),
				y,
				MAIN_HALF_W,
				HALF_H,
				PERSP,
			);
			writeQuadIndices(indices, lIdx);
			writeQuadIndices(indices, rIdx);
			fillQuadColor(colors, lIdx, COLOR_DARK.r, COLOR_DARK.g, COLOR_DARK.b);
			fillQuadColor(colors, rIdx, COLOR_DARK.r, COLOR_DARK.g, COLOR_DARK.b);
		}

		geo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		geo.setIndex(new THREE.BufferAttribute(indices, 1));
		return { geometry: geo, colorArray: colors };
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
			const c = isPeak
				? COLOR_PEAK
				: value * COL_CELL_COUNT > ci
					? COLOR_LIT
					: COLOR_DARK;
			fillQuadColor(colorArray, ci * 2, c.r, c.g, c.b);
			fillQuadColor(colorArray, ci * 2 + 1, c.r, c.g, c.b);
		}
		const attr = mesh.geometry.getAttribute("color");
		attr.needsUpdate = true;
	});

	return (
		<mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
			<meshStandardMaterial vertexColors />
		</mesh>
	);
}

// ─── Side tick BufferGeometry (left + right, inverted: unlit = cyan) ──────────
function KenwoodSideBandMesh({ fi }: { fi: number }) {
	const meshRef = useRef<THREE.Mesh>(null);

	const { geometry, colorArray } = useMemo(() => {
		const geo = new THREE.BufferGeometry();
		const positions = new Float32Array(CELLS_PER_BAND * 12);
		const colors = new Float32Array(CELLS_PER_BAND * 12);
		const indices = new Uint16Array(CELLS_PER_BAND * 6);

		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			const y = cellY(ci);
			const lIdx = ci * 2;
			const rIdx = ci * 2 + 1;
			writePerspQuad(
				positions,
				lIdx,
				sideLeftCX(fi),
				y,
				SIDE_HALF_W,
				HALF_H,
				PERSP,
			);
			writePerspQuad(
				positions,
				rIdx,
				sideRightCX(fi),
				y,
				SIDE_HALF_W,
				HALF_H,
				PERSP,
			);
			writeQuadIndices(indices, lIdx);
			writeQuadIndices(indices, rIdx);
			fillQuadColor(
				colors,
				lIdx,
				COLOR_SIDE_OFF.r,
				COLOR_SIDE_OFF.g,
				COLOR_SIDE_OFF.b,
			);
			fillQuadColor(
				colors,
				rIdx,
				COLOR_SIDE_OFF.r,
				COLOR_SIDE_OFF.g,
				COLOR_SIDE_OFF.b,
			);
		}

		geo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		geo.setIndex(new THREE.BufferAttribute(indices, 1));
		return { geometry: geo, colorArray: colors };
	}, [fi]);

	useFrame(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const bars = store.get(spectrogramAtom);
		const freqLevel = bars?.[BAND_INDICES[fi]];
		const value = freqLevel?.value?.[0] ?? 0;

		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			const c = value * COL_CELL_COUNT > ci ? COLOR_DARK : COLOR_SIDE_OFF;
			fillQuadColor(colorArray, ci * 2, c.r, c.g, c.b);
			fillQuadColor(colorArray, ci * 2 + 1, c.r, c.g, c.b);
		}
		const attr = mesh.geometry.getAttribute("color");
		attr.needsUpdate = true;
	});

	return (
		<mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
			<meshStandardMaterial vertexColors />
		</mesh>
	);
}
