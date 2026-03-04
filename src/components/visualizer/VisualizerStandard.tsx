import { Line, Plane } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MeshStandardMaterial } from "three";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Montserrat 600 font singleton ───────────────────────────────────────────
const _fontLoader = new FontLoader();
let _font: Font | null = null;
const _fontReady: Promise<Font> = fetch("/montserrat-600.typeface.json")
	.then((r) => r.json())
	.then((data) => {
		_font = _fontLoader.parse(data);
		return _font;
	});

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL_WIDTH = 6;
const CELL_HEIGHT = 1;
/** 1バンドあたりの列数（左右2列） */
const COLS_PER_BAND = 2;
const COL_CELL_COUNT = 32;
const ROW_CELL_GAP = 2;
const COL_CELL_GAP = 0.6;
const ANALYZER_ANGLE_DEGREE = 24;
/** 周波数バンド数（ANSI 1/3-octave から 9 バンド選択） */
const FREQ_COUNT = 9;
/** 総列数 = バンド数 × 列/バンド */
const TOTAL_COLS = FREQ_COUNT * COLS_PER_BAND;

const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 25, 28] as const;
const FREQ_ARRAY = ["60", "120", "250", "500", "1k", "2k", "4k", "8k", "16k"];

// ─── Position helpers ─────────────────────────────────────────────────────────
const BAND_STRIDE = (CELL_WIDTH + ROW_CELL_GAP) * COLS_PER_BAND;
/** 左列の X 中心 */
const leftCX = (fi: number) => BAND_STRIDE * fi + ROW_CELL_GAP + CELL_WIDTH / 2;
/** 右列の X 中心 */
const rightCX = (fi: number) =>
	BAND_STRIDE * fi + ROW_CELL_GAP + CELL_WIDTH + ROW_CELL_GAP + CELL_WIDTH / 2;
/** セルの Y 中心 */
const cellY = (ci: number) => (CELL_HEIGHT + COL_CELL_GAP) * ci + COL_CELL_GAP;

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerStandard() {
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);

	useFrame(() => {
		if (!audioMotionAnalyzer.isOn) return;
		store.set(
			spectrogramAtom,
			audioMotionAnalyzer.getBars() as AnalyzerBarData[],
		);
	});

	const totalWidth =
		(CELL_WIDTH + ROW_CELL_GAP) * TOTAL_COLS - ROW_CELL_GAP + 80;
	const totalHeight =
		(CELL_HEIGHT + COL_CELL_GAP) * COL_CELL_COUNT - COL_CELL_GAP;

	return (
		<group
			position={[-(totalWidth / 2), -(totalHeight / 2), 0]}
			scale={1.6}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => (
				<group key={`band-${fi}`}>
					{Array.from({ length: COL_CELL_COUNT }).map((_, ci) => (
						<VisualizerCell key={`c-${fi}-${ci}`} fi={fi} ci={ci} />
					))}
					{/* Underline decorations (left col + right col) */}
					<group rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}>
						<Line
							points={[
								[
									(CELL_WIDTH + ROW_CELL_GAP) * (fi * 2) -
										ROW_CELL_GAP / 2 +
										0.3,
									-2,
									0,
								],
								[
									(CELL_WIDTH + ROW_CELL_GAP) * (fi * 2) -
										ROW_CELL_GAP / 2 +
										CELL_WIDTH -
										2,
									-2,
									0,
								],
							]}
							lineWidth={4}
							color="#67e8f9"
						/>
						<Line
							points={[
								[
									(CELL_WIDTH + ROW_CELL_GAP) * (fi * 2 + 1) -
										ROW_CELL_GAP / 2 +
										2,
									-2,
									0,
								],
								[
									(CELL_WIDTH + ROW_CELL_GAP) * (fi * 2 + 1) -
										ROW_CELL_GAP / 2 +
										CELL_WIDTH -
										0.3,
									-2,
									0,
								],
							]}
							lineWidth={4}
							color="#67e8f9"
						/>
						<FrequencyLabel
							label={FREQ_ARRAY[fi]}
							position={[
								(CELL_WIDTH + ROW_CELL_GAP) * (fi * 2) - ROW_CELL_GAP,
								-2,
								0,
							]}
						/>
					</group>
				</group>
			))}
		</group>
	);
}

// ─── Cell component: draws left + right columns for one band ─────────────────
function VisualizerCell({ fi, ci }: { fi: number; ci: number }) {
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
			(ci - 2 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci - 1);

		const c = color.set(
			isPeak ? "#3b82f6" : value * COL_CELL_COUNT > ci ? "#a5f3fc" : "#3b0764",
		);
		leftRef.current.color.copy(c);
		rightRef.current.color.copy(c);
	});

	return (
		<>
			<Plane
				position={[leftCX(fi), cellY(ci), 0]}
				args={[CELL_WIDTH, CELL_HEIGHT]}
			>
				<meshStandardMaterial ref={leftRef} />
			</Plane>
			<Plane
				position={[rightCX(fi), cellY(ci), 0]}
				args={[CELL_WIDTH, CELL_HEIGHT]}
			>
				<meshStandardMaterial ref={rightRef} />
			</Plane>
		</>
	);
}

/**
 * 周波数ラベルを Three.js TextGeometry（Montserrat 600）で描画する。
 *
 * TextGeometry は CPU サイドで Montserrat 600 のグリフ形状を展開するため、
 * @react-three/drei <Text>(troika) のように追加 WebGL コンテキストを消費しない。
 * グリフ形状は /public/montserrat-600.typeface.json からロードする。
 */
function FrequencyLabel({
	label,
	position,
}: {
	label: string;
	position: [number, number, number];
}) {
	// フォントがモジュールロード時点で準備済みなら即時使用、
	// まだの場合は _fontReady 完了後に state を更新して再レンダリングする。
	const [font, setFont] = useState<Font | null>(_font);

	useEffect(() => {
		if (_font) {
			setFont(_font);
			return;
		}
		_fontReady.then(setFont);
	}, []);

	const geometry = useMemo(() => {
		if (!font || !label) return null;
		const g = new TextGeometry(label, {
			font,
			size: 2.4,
			depth: 0,
			curveSegments: 12,
			bevelEnabled: false,
		});
		// テキストをバウンディングボックス中心に居中新
		// （元の <Text> の anchorX='center' anchorY='middle' と同一挙動）
		g.computeBoundingBox();
		g.center();
		return g;
	}, [font, label]);

	if (!geometry) return null;

	return (
		<mesh position={position} geometry={geometry}>
			<meshBasicMaterial color="#10b981" />
		</mesh>
	);
}
