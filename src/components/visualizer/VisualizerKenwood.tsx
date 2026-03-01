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
const FREQ_COUNT = 11;
const CELL_HEIGHT = 0.6;
const COL_CELL_COUNT = 26;
const COL_CELL_GAP = 0.8;
const ANALYZER_ANGLE_DEGREE = 20;

const SUB_COL_WIDTH = 3.6;
const SUB_COL_GAP = 0.5;
const MAIN_BAR_WIDTH = SUB_COL_WIDTH * 2 + SUB_COL_GAP;

const SIDE_BAR_WIDTH = 0.6;
const SIDE_GAP = 0.5;
const SIDE_UNIT = SIDE_BAR_WIDTH + SIDE_GAP;

const BAND_GAP = 2.0;
const BAND_STRIDE = SIDE_UNIT + MAIN_BAR_WIDTH + SIDE_UNIT + BAND_GAP;
const TOTAL_WIDTH = BAND_STRIDE * FREQ_COUNT - BAND_GAP;

/**
 * ANSI 1/3-octave indices (mode 6, minFreq 20) for DPX-5021M 11 bands:
 * 63, 125, 250, 500, 1k, 2k, 4k, 6.3k, 8k, 12.5k, 16k Hz
 */
const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 24, 25, 27, 28] as const;

const FREQ_ARRAY = [
	"62.5",
	"125",
	"250",
	"500",
	"1k",
	"2k",
	"4k",
	"6.3k",
	"8k",
	"12.5k",
	"16k",
];

// ─── X/Y helpers ──────────────────────────────────────────────────────────────
const sideLeftCX = (fi: number) => BAND_STRIDE * fi + SIDE_BAR_WIDTH / 2;
const subLeftCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + SUB_COL_WIDTH / 2;
const subRightCX = (fi: number) => subLeftCX(fi) + SUB_COL_WIDTH + SUB_COL_GAP;
const sideRightCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + MAIN_BAR_WIDTH + SIDE_GAP + SIDE_BAR_WIDTH / 2;
const bandCenterCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + MAIN_BAR_WIDTH / 2;
const cellY = (ci: number) => (CELL_HEIGHT + COL_CELL_GAP) * ci + COL_CELL_GAP;

// ─── InstancedMesh counts ─────────────────────────────────────────────────────
// main: left-sub-col + right-sub-col  per (freq × col)
const MAIN_COUNT = FREQ_COUNT * COL_CELL_COUNT * 2;
// side: left-bar   + right-bar        per (freq × col)
const SIDE_COUNT = FREQ_COUNT * COL_CELL_COUNT * 2;

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerKenwood() {
	const mainRef = useRef<THREE.InstancedMesh>(null);
	const sideRef = useRef<THREE.InstancedMesh>(null);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const { invalidate } = useThree();

	// demand モードで再生開始時に最初のフレームをキックする
	useEffect(() => {
		if (isPlaying) invalidate();
	}, [isPlaying, invalidate]);

	// ── Per-frame: 初回のみ matrix/color 初期化、以降は色更新 ─────────────────
	const initializedRef = useRef(false);
	const _c = useRef(new THREE.Color());

	useFrame(({ invalidate: inv }) => {
		const main = mainRef.current;
		const side = sideRef.current;

		// ── 初回フレームで matrix + instanceColor を初期化 ──────────────────
		if (!initializedRef.current && main && side) {
			const d = new THREE.Object3D();
			const darkMain = new THREE.Color("#080018");
			const darkSide = new THREE.Color("#050012");

			for (let fi = 0; fi < FREQ_COUNT; fi++) {
				for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
					const y = cellY(ci);
					const base = (fi * COL_CELL_COUNT + ci) * 2;

					d.position.set(subLeftCX(fi), y, 0);
					d.scale.set(SUB_COL_WIDTH, CELL_HEIGHT, 1);
					d.updateMatrix();
					main.setMatrixAt(base, d.matrix);
					main.setColorAt(base, darkMain);

					d.position.set(subRightCX(fi), y, 0);
					d.updateMatrix();
					main.setMatrixAt(base + 1, d.matrix);
					main.setColorAt(base + 1, darkMain);

					d.position.set(sideLeftCX(fi), y, 0);
					d.scale.set(SIDE_BAR_WIDTH, CELL_HEIGHT, 1);
					d.updateMatrix();
					side.setMatrixAt(base, d.matrix);
					side.setColorAt(base, darkSide);

					d.position.set(sideRightCX(fi), y, 0);
					d.updateMatrix();
					side.setMatrixAt(base + 1, d.matrix);
					side.setColorAt(base + 1, darkSide);
				}
			}

			main.instanceMatrix.needsUpdate = true;
			side.instanceMatrix.needsUpdate = true;
			if (main.instanceColor) main.instanceColor.needsUpdate = true;
			if (side.instanceColor) side.instanceColor.needsUpdate = true;
			initializedRef.current = true;
			// 初期化完了を描画に反映するためもう 1 フレーム要求
			inv();
			return;
		}

		const bars = audioMotionAnalyzer.getBars() as AnalyzerBarData[];
		store.set(spectrogramAtom, bars);

		if (!main || !side) {
			if (isPlaying) inv();
			return;
		}

		const c = _c.current;

		for (let fi = 0; fi < FREQ_COUNT; fi++) {
			const freqLevel = bars[BAND_INDICES[fi]];
			const value = freqLevel?.value?.[0] ?? 0;
			const peak = freqLevel?.peak?.[0] ?? 0;

			for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
				const base = (fi * COL_CELL_COUNT + ci) * 2;

				const isPeak =
					(ci < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci + 1) ||
					(ci - 2 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci - 1);

				// main: cyan when lit, near-black when dark, white at peak
				c.set(
					isPeak
						? "#ffffff"
						: value * COL_CELL_COUNT > ci
							? "#a5f3fc"
							: "#080018",
				);
				main.setColorAt(base, c);
				main.setColorAt(base + 1, c);

				// side: inverted — teal when un-lit, near-black when lit
				c.set(value * COL_CELL_COUNT <= ci ? "#0e7490" : "#050012");
				side.setColorAt(base, c);
				side.setColorAt(base + 1, c);
			}
		}

		if (main.instanceColor) main.instanceColor.needsUpdate = true;
		if (side.instanceColor) side.instanceColor.needsUpdate = true;

		if (isPlaying) inv();
	});

	const totalHeight =
		(CELL_HEIGHT + COL_CELL_GAP) * COL_CELL_COUNT - COL_CELL_GAP;
	const SCALE = 1.6;

	return (
		<group
			position={[-TOTAL_WIDTH * (SCALE / 2), -totalHeight * (SCALE / 2), 0]}
			scale={SCALE}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{/* Main bars: 2 sub-cols × FREQ_COUNT × COL_CELL_COUNT instances */}
			<instancedMesh
				ref={mainRef}
				args={[undefined, undefined, MAIN_COUNT]}
				frustumCulled={false}
			>
				<planeGeometry args={[1, 1]} />
				<meshStandardMaterial vertexColors />
			</instancedMesh>

			{/* Side bars: 2 sides × FREQ_COUNT × COL_CELL_COUNT instances */}
			<instancedMesh
				ref={sideRef}
				args={[undefined, undefined, SIDE_COUNT]}
				frustumCulled={false}
			>
				<planeGeometry args={[1, 1]} />
				<meshStandardMaterial vertexColors />
			</instancedMesh>

			{/* Frequency labels (11 groups — no optimization needed) */}
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => (
				<group
					key={`k-label-${fi}`}
					rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}
				>
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
				</group>
			))}
		</group>
	);
}
