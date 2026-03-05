import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
	createPerspParams,
	fillQuadColor,
	writePerspQuad,
	writeQuadIndices,
} from "@/lib/perspProject";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Layout constants ─────────────────────────────────────────────────────────
// Sub-visualizer: 7 bands wide (centre 7 of the 11 Kenwood bands),
// 7 rows tall, cells slightly smaller than the main visualizer.
const FREQ_COUNT = 10; // centre bands only
const CELL_HEIGHT = 0.4; // main = 0.6
const COL_CELL_COUNT = 7; // rows
const COL_CELL_GAP = 0.6; // main = 0.8
const ANALYZER_ANGLE_DEGREE = 32;

// Sub bar geometry (pair per band, no side-tick bars)
const SUB_COL_WIDTH = 2.2; // main = 3.6
const SUB_COL_GAP = 0.4; // gap between left+right bars within band

// MAIN_BAR_WIDTH is derived from SUB_COL_WIDTH so they stay in sync:
//   left bar + gap + right bar  (mirrors VisualizerKenwood: 3.6 + 0.5 + 3.6 = 7.7)
const MAIN_BAR_WIDTH = SUB_COL_WIDTH * 2 + SUB_COL_GAP;
const BAND_GAP = 1.4;
const BAND_STRIDE = MAIN_BAR_WIDTH + BAND_GAP; // 11.9

// Group span — 7 bands centred on the same world X=0 as the main
const TOTAL_WIDTH = BAND_STRIDE * FREQ_COUNT; // 83.3

// ANSI 1/3-oct indices for the central 7 of 11 bands (~125 Hz … 6 kHz)
const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 24, 27, 28] as const;

const SCALE = 2;

// Position sub just below the main Kenwood visualizer.
// Main bottom world Y ≈ -27 (self-centred around 0).
// Top of sub (ci=6) should sit ~2 world units below main bottom.
//   topCellLocal = cellY(COL_CELL_COUNT-1) = (CELL_HEIGHT+COL_CELL_GAP)*(COL_CELL_COUNT-1) + COL_CELL_GAP
//                = 1.0 * 6 + 0.6 = 6.6   →  world = 6.6 * 1.8 = 11.88
//   groupY = wantedTop − topCellWorld = -29 − 11.88 = -40.88  →  use -40
const SUB_Y_OFFSET = -26;

// Wing bar dimensions: widest at TOP row, narrowest at BOTTOM row.
// This fills the triangular gap between the tilted sub-spectrum and the
// screen vertical (screen edges).
const WING_MAX_LOCAL_WIDTH = 28; // top row (ci = COL_CELL_COUNT-1)
const WING_MIN_LOCAL_WIDTH = 24.5; // bottom row (ci = 0)
// Gap (in local units) between the wing bar and the outermost spectrum bar.
const WING_GAP = 1;

// ─── Position helpers ─────────────────────────────────────────────────────────
const subLeftCX = (fi: number) => BAND_STRIDE * fi + SUB_COL_WIDTH / 2;
const subRightCX = (fi: number) => subLeftCX(fi) + SUB_COL_WIDTH + SUB_COL_GAP;
const cellY = (ci: number) => (CELL_HEIGHT + COL_CELL_GAP) * ci + COL_CELL_GAP;

// ─── Perspective projection (台形レイアウト) ───────────────────────────────────
const GRID_CX = (subLeftCX(0) + subRightCX(FREQ_COUNT - 1)) / 2;
const GRID_CY = (cellY(0) + cellY(COL_CELL_COUNT - 1)) / 2;
const PERSP = createPerspParams(GRID_CX, GRID_CY, 50, ANALYZER_ANGLE_DEGREE);

// ─── Cached colors ────────────────────────────────────────────────────────────
const COLOR_DARK = new THREE.Color("#3b0764");
const COLOR_LIT = new THREE.Color("#6dceff");
const COLOR_WING = new THREE.Color("#6dceff");

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerKenwoodSub() {
	return (
		<group position={[-GRID_CX * SCALE, SUB_Y_OFFSET, 0]} scale={SCALE}>
			{/* Wings: inverted triangle, widest at top, narrowest at bottom */}
			<KenwoodWingMesh side="left" />
			<KenwoodWingMesh side="right" />

			{/* Sub-spectrum cells — 10 bands × 7 rows, no side ticks */}
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => (
				<group key={`sub-band-${fi}`}>
					<SubBandMesh fi={fi} />
				</group>
			))}
		</group>
	);
}

// ─── Per-band BufferGeometry constants ───────────────────────────────────────
const CELLS_PER_BAND = COL_CELL_COUNT * 2;
const SUB_HALF_W = SUB_COL_WIDTH / 2;
const HALF_H = CELL_HEIGHT / 2;

// ─── Wing BufferGeometry ─────────────────────────────────────────────────────
// Horizontal bars whose width increases from bottom (ci=0) to top (ci=6).
// Each wing is a single mesh with COL_CELL_COUNT quads, each with different width.
function KenwoodWingMesh({ side }: { side: "left" | "right" }) {
	const meshRef = useRef<THREE.Mesh>(null);

	const geometry = useMemo(() => {
		const geo = new THREE.BufferGeometry();
		const positions = new Float32Array(COL_CELL_COUNT * 12);
		const colors = new Float32Array(COL_CELL_COUNT * 12);
		const indices = new Uint16Array(COL_CELL_COUNT * 6);

		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			const t = ci / (COL_CELL_COUNT - 1);
			const width = WING_MIN_LOCAL_WIDTH * (1 - t) + WING_MAX_LOCAL_WIDTH * t;
			const y = cellY(ci);
			const xCenter =
				side === "left"
					? -WING_GAP - width / 2
					: TOTAL_WIDTH - BAND_GAP + WING_GAP + width / 2;
			writePerspQuad(positions, ci, xCenter, y, width / 2, HALF_H, PERSP);
			writeQuadIndices(indices, ci);
			fillQuadColor(colors, ci, COLOR_WING.r, COLOR_WING.g, COLOR_WING.b);
		}

		geo.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		geo.setIndex(new THREE.BufferAttribute(indices, 1));
		return geo;
	}, [side]);

	return (
		<mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
			<meshStandardMaterial vertexColors />
		</mesh>
	);
}

// ─── Sub band BufferGeometry (left + right bars, cyan when lit) ──────────────
function SubBandMesh({ fi }: { fi: number }) {
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
				SUB_HALF_W,
				HALF_H,
				PERSP,
			);
			writePerspQuad(
				positions,
				rIdx,
				subRightCX(fi),
				y,
				SUB_HALF_W,
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

		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			const c = value * COL_CELL_COUNT > ci ? COLOR_LIT : COLOR_DARK;
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
