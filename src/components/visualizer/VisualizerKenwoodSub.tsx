import { Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { MeshStandardMaterial } from "three";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Layout constants ─────────────────────────────────────────────────────────
// Sub-visualizer: 7 bands wide (centre 7 of the 11 Kenwood bands),
// 7 rows tall, cells slightly smaller than the main visualizer.
const FREQ_COUNT = 10; // centre bands only
const CELL_HEIGHT = 0.4; // main = 0.6
const COL_CELL_COUNT = 7; // rows
const COL_CELL_GAP = 0.6; // main = 0.8
const ANALYZER_ANGLE_DEGREE = 24;

// Sub bar geometry (pair per band, no side-tick bars)
const SUB_COL_WIDTH = 2.8; // main = 3.6
const SUB_COL_GAP = 0.4; // gap between left+right bars within band

// MAIN_BAR_WIDTH is derived from SUB_COL_WIDTH so they stay in sync:
//   left bar + gap + right bar  (mirrors VisualizerKenwood: 3.6 + 0.5 + 3.6 = 7.7)
const MAIN_BAR_WIDTH = SUB_COL_WIDTH * 2 + SUB_COL_GAP;
const BAND_GAP = 0;
const BAND_STRIDE = MAIN_BAR_WIDTH + BAND_GAP; // 11.9

// Group span — 7 bands centred on the same world X=0 as the main
const TOTAL_WIDTH = BAND_STRIDE * FREQ_COUNT; // 83.3

// ANSI 1/3-oct indices for the central 7 of 11 bands (~125 Hz … 6 kHz)
const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 24, 27, 28] as const;

const SCALE = 1.6;

// Position sub just below the main Kenwood visualizer.
// Main bottom world Y ≈ -27 (self-centred around 0).
// Top of sub (ci=6) should sit ~2 world units below main bottom.
//   topCellLocal = cellY(COL_CELL_COUNT-1) = (CELL_HEIGHT+COL_CELL_GAP)*(COL_CELL_COUNT-1) + COL_CELL_GAP
//                = 1.0 * 6 + 0.6 = 6.6   →  world = 6.6 * 1.6 = 10.56
//   groupY = wantedTop − topCellWorld = -29 − 10.56 = -39.56  →  use -40
const SUB_Y_OFFSET = -20;

// Wing bar dimensions: widest at TOP row, narrowest at BOTTOM row.
// This fills the triangular gap between the tilted sub-spectrum and the
// screen vertical (screen edges).
const WING_MAX_LOCAL_WIDTH = 17; // top row (ci = COL_CELL_COUNT-1)
const WING_MIN_LOCAL_WIDTH = 14; // bottom row (ci = 0)

// ─── Position helpers ─────────────────────────────────────────────────────────
const subLeftCX = (fi: number) => BAND_STRIDE * fi + SUB_COL_WIDTH / 2;
const subRightCX = (fi: number) => subLeftCX(fi) + SUB_COL_WIDTH + SUB_COL_GAP;
const cellY = (ci: number) => (CELL_HEIGHT + COL_CELL_GAP) * ci + COL_CELL_GAP;

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerKenwoodSub() {
	return (
		<group
			position={[-TOTAL_WIDTH * (SCALE / 2), SUB_Y_OFFSET, 0]}
			scale={SCALE}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{/* Wings: inverted triangle, widest at top, narrowest at bottom */}
			<KenwoodWing side="left" />
			<KenwoodWing side="right" />

			{/* Sub-spectrum cells — 7 bands × 7 rows, no side ticks */}
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => (
				<group key={`sub-band-${fi}`}>
					{Array.from({ length: COL_CELL_COUNT }).map((_, ci) => (
						<SubCell key={`sc-${fi}-${ci}`} fi={fi} ci={ci} />
					))}
				</group>
			))}
		</group>
	);
}

// ─── Wing decoration ─────────────────────────────────────────────────────────
// Horizontal bars whose width increases from bottom (ci=0) to top (ci=6).
// Anchored flush to the outer vertical edge of the sub-spectrum, they form a
// right-triangle that fills the gap between the tilted strip and the screen.
function KenwoodWing({ side }: { side: "left" | "right" }) {
	// Brighter toward the top (where the bar is widest)
	const BAR_COLORS = [
		"#0c4a6e", // ci=0 bottom (darkest / narrowest)
		"#0e6090",
		"#0e7490",
		"#0891b2",
		"#06b6d4",
		"#22d3ee",
		"#67e8f9", // ci=6 top (brightest / widest)
	];

	return (
		<>
			{Array.from({ length: COL_CELL_COUNT }).map((_, ci) => {
				// t=0 at bottom (ci=0), t=1 at top (ci=COL_CELL_COUNT-1)
				const t = ci / (COL_CELL_COUNT - 1);
				const width = WING_MIN_LOCAL_WIDTH * (1 - t) + WING_MAX_LOCAL_WIDTH * t;
				const y = cellY(ci);
				// Left wing: right edge flush to x=0 (left edge of band 0)
				// Right wing: left edge flush to x=TOTAL_WIDTH
				const xCenter = side === "left" ? -width / 2 : TOTAL_WIDTH + width / 2;
				const color = BAR_COLORS[ci] ?? "#0e7490";

				return (
					<Plane
						key={`w-${ci}`}
						position={[xCenter, y, 0]}
						args={[width, CELL_HEIGHT]}
						material-color={color}
					/>
				);
			})}
		</>
	);
}

// ─── Sub cell (left + right bars, cyan when lit, white peak) ─────────────────
function SubCell({ fi, ci }: { fi: number; ci: number }) {
	const color = useMemo(() => new THREE.Color(), []);
	const leftRef = useRef<MeshStandardMaterial>(null);
	const rightRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!leftRef.current || !rightRef.current) return;
		const bars = store.get(spectrogramAtom);
		const freqLevel = bars?.[BAND_INDICES[fi]];
		const value = freqLevel?.value?.[0] ?? 0;

		const c = color.set(value * COL_CELL_COUNT > ci ? "#a5f3fc" : "#3b0764");
		leftRef.current.color.copy(c);
		rightRef.current.color.copy(c);
	});

	const y = cellY(ci);
	return (
		<>
			<Plane
				position={[subLeftCX(fi), y, 0]}
				args={[SUB_COL_WIDTH, CELL_HEIGHT]}
			>
				<meshStandardMaterial ref={leftRef} />
			</Plane>
			<Plane
				position={[subRightCX(fi), y, 0]}
				args={[SUB_COL_WIDTH, CELL_HEIGHT]}
			>
				<meshStandardMaterial ref={rightRef} />
			</Plane>
		</>
	);
}
