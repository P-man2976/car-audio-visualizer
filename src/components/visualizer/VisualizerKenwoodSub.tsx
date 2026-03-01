import { Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { MeshStandardMaterial } from "three";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Constants (shared with VisualizerKenwood) ────────────────────────────────
const FREQ_COUNT = 11;
const CELL_HEIGHT = 0.6;
// Sub-visualizer uses fewer rows to make a compact level-meter strip
const SUB_COL_COUNT = 8;
const COL_CELL_GAP = 0.8;
const ANALYZER_ANGLE_DEGREE = 24;

const SUB_COL_WIDTH = 3.6;
const SUB_COL_GAP = 0.5;
const MAIN_BAR_WIDTH = 7.7;
const SIDE_BAR_WIDTH = 0.6;
const SIDE_GAP = 0.5;
const SIDE_UNIT = SIDE_BAR_WIDTH + SIDE_GAP; // 1.1
const BAND_GAP = 2.0;
const BAND_STRIDE =
	SIDE_UNIT + MAIN_BAR_WIDTH + SIDE_GAP + SIDE_BAR_WIDTH + BAND_GAP; // 11.9
const TOTAL_WIDTH = BAND_STRIDE * FREQ_COUNT;

const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 24, 25, 27, 28] as const;

const subLeftCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + SUB_COL_WIDTH / 2;
const subRightCX = (fi: number) => subLeftCX(fi) + SUB_COL_WIDTH + SUB_COL_GAP;
const sideLeftCX = (fi: number) => BAND_STRIDE * fi + SIDE_BAR_WIDTH / 2;
const sideRightCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + MAIN_BAR_WIDTH + SIDE_GAP + SIDE_BAR_WIDTH / 2;
const cellY = (ci: number) => (CELL_HEIGHT + COL_CELL_GAP) * ci + COL_CELL_GAP;

// ─── Positioning ──────────────────────────────────────────────────────────────
// Place below the main Kenwood visualizer (main ends at ~world y=-27).
// Sub group origin at world y=-48; sub spans world y ≈ -46.7 to -30.
const SUB_Y_OFFSET = -48;
const SCALE = 1.6;

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerKenwoodSub() {
	return (
		<group
			position={[-TOTAL_WIDTH * (SCALE / 2), SUB_Y_OFFSET, 0]}
			scale={SCALE}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => (
				<group key={`sub-band-${fi}`}>
					{Array.from({ length: SUB_COL_COUNT }).map((_, ci) => (
						<SubMainCell key={`sm-${fi}-${ci}`} fi={fi} ci={ci} />
					))}
					{Array.from({ length: SUB_COL_COUNT }).map((_, ci) => (
						<SubSideCell key={`ss-${fi}-${ci}`} fi={fi} ci={ci} />
					))}
				</group>
			))}
		</group>
	);
}

// ─── Sub main cell (left + right sub-bars) ────────────────────────────────────
function SubMainCell({ fi, ci }: { fi: number; ci: number }) {
	const color = useMemo(() => new THREE.Color(), []);
	const leftRef = useRef<MeshStandardMaterial>(null);
	const rightRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!leftRef.current || !rightRef.current) return;
		const bars = store.get(spectrogramAtom);
		const freqLevel = bars?.[BAND_INDICES[fi]];
		const value = freqLevel?.value?.[0] ?? 0;
		const peak = freqLevel?.peak?.[0] ?? 0;

		const isPeak =
			(ci < peak * SUB_COL_COUNT && peak * SUB_COL_COUNT < ci + 1) ||
			(ci - 2 < peak * SUB_COL_COUNT && peak * SUB_COL_COUNT < ci - 1);

		const c = color.set(
			isPeak ? "#ffffff" : value * SUB_COL_COUNT > ci ? "#a5f3fc" : "#080018",
		);
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

// ─── Sub side tick cell (inverted: unlit = cyan) ──────────────────────────────
function SubSideCell({ fi, ci }: { fi: number; ci: number }) {
	const color = useMemo(() => new THREE.Color(), []);
	const leftRef = useRef<MeshStandardMaterial>(null);
	const rightRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!leftRef.current || !rightRef.current) return;
		const bars = store.get(spectrogramAtom);
		const freqLevel = bars?.[BAND_INDICES[fi]];
		const value = freqLevel?.value?.[0] ?? 0;

		const c = color.set(value * SUB_COL_COUNT > ci ? "#050012" : "#0e7490");
		leftRef.current.color.copy(c);
		rightRef.current.color.copy(c);
	});

	const y = cellY(ci);
	return (
		<>
			<Plane
				position={[sideLeftCX(fi), y, 0]}
				args={[SIDE_BAR_WIDTH, CELL_HEIGHT]}
			>
				<meshStandardMaterial ref={leftRef} />
			</Plane>
			<Plane
				position={[sideRightCX(fi), y, 0]}
				args={[SIDE_BAR_WIDTH, CELL_HEIGHT]}
			>
				<meshStandardMaterial ref={rightRef} />
			</Plane>
		</>
	);
}
