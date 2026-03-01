import { Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { MeshStandardMaterial } from "three";
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
					{Array.from({ length: COL_CELL_COUNT }).map((_, ci) => (
						<KenwoodMainCell key={`m-${fi}-${ci}`} fi={fi} ci={ci} />
					))}
					{Array.from({ length: COL_CELL_COUNT }).map((_, ci) => (
						<KenwoodSideCell key={`s-${fi}-${ci}`} fi={fi} ci={ci} />
					))}
				</group>
			))}
		</group>
	);
}

// ─── Main sub-bar cell (left + right, cyan when lit) ─────────────────────────
function KenwoodMainCell({ fi, ci }: { fi: number; ci: number }) {
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
			(ci < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci + 1) ||
			(ci - 1 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci);

		const c = color.set(
			isPeak ? "#ffffff" : value * COL_CELL_COUNT > ci ? "#6dceff" : "#3b0764",
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

// ─── Side tick cell (left + right, inverted: unlit = cyan) ───────────────────
function KenwoodSideCell({ fi, ci }: { fi: number; ci: number }) {
	const color = useMemo(() => new THREE.Color(), []);
	const leftRef = useRef<MeshStandardMaterial>(null);
	const rightRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!leftRef.current || !rightRef.current) return;
		const bars = store.get(spectrogramAtom);
		const freqLevel = bars?.[BAND_INDICES[fi]];
		const value = freqLevel?.value?.[0] ?? 0;

		// inverted: below signal level = dark, above = cyan
		const c = color.set(value * COL_CELL_COUNT > ci ? "#3b0764" : "#91daff");
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
