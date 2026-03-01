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
// TextGeometry は CPUサイドでグリフ形状を展開するため、
// @react-three/drei <Text>(troika) のような追加 WebGL コンテキストを消費しない。
// モジュールロード時にフォントJSONを取得し、コンポーネントマウント前に準備完了させる。
const _fontLoader = new FontLoader();
let _font: Font | null = null;
/** フォント准備完了 Promise — 一度評価されるのみ */
const _fontReady: Promise<Font> = fetch("/montserrat-600.typeface.json")
	.then((r) => r.json())
	.then((data) => {
		_font = _fontLoader.parse(data);
		return _font;
	});

const CELL_WIDTH = 6;
const CELL_HEIGHT = 1;
const ROW_CELL_COUNT = 18;
const COL_CELL_COUNT = 32;
const ROW_CELL_GAP = 2;
const COL_CELL_GAP = 0.6;
const ANALYZER_ANGLE_DEGREE = 24;

const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 25, 28] as const;
const FREQ_ARRAY = ["60", "120", "250", "500", "1k", "2k", "4k", "8k", "16k"];

export function VisualizerStandard() {
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);

	useFrame(() => {
		store.set(
			spectrogramAtom,
			audioMotionAnalyzer.getBars() as AnalyzerBarData[],
		);
	});

	return (
		<group
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
			{Array.from({ length: ROW_CELL_COUNT }).map((_, rowIndex) => (
				<group key={`row-${rowIndex}`}>
					{Array.from({ length: COL_CELL_COUNT }).map((_, colIndex) => (
						<VisualizerCell
							key={`${rowIndex}-${colIndex}`}
							rowIndex={rowIndex}
							colIndex={colIndex}
						/>
					))}
					<group rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}>
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
						<FrequencyLabel
							label={FREQ_ARRAY[(rowIndex - 1) / 2] ?? ""}
							position={[
								(CELL_WIDTH + ROW_CELL_GAP) * rowIndex - ROW_CELL_GAP,
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

function VisualizerCell({
	rowIndex,
	colIndex,
}: {
	rowIndex: number;
	colIndex: number;
}) {
	const color = useMemo(() => new THREE.Color(), []);
	const matRef = useRef<MeshStandardMaterial>(null);

	useFrame(() => {
		if (!matRef.current) return;
		const bars = store.get(spectrogramAtom);
		const freqLevel = bars?.[BAND_INDICES[Math.trunc(rowIndex / 2)]];
		const value = freqLevel?.value?.[0] ?? 0;
		const peak = freqLevel?.peak?.[0] ?? 0;

		const isPeak =
			(colIndex < peak * COL_CELL_COUNT &&
				peak * COL_CELL_COUNT < colIndex + 1) ||
			(colIndex - 2 < peak * COL_CELL_COUNT &&
				peak * COL_CELL_COUNT < colIndex - 1);

		matRef.current.color = color.set(
			isPeak
				? "#3b82f6"
				: value * COL_CELL_COUNT > colIndex
					? "#a5f3fc"
					: "#3b0764",
		);
	});

	return (
		<Plane
			position={[
				(CELL_WIDTH + ROW_CELL_GAP) * rowIndex + ROW_CELL_GAP,
				(CELL_HEIGHT + COL_CELL_GAP) * colIndex + COL_CELL_GAP,
				0,
			]}
			args={[CELL_WIDTH, CELL_HEIGHT]}
		>
			<meshStandardMaterial ref={matRef} />
		</Plane>
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
		// typeface.js フォントは Y 座標が Three.js と反転しているため
		// scale={[1, -1, 1]} で上下を反転して正立させる。
		<mesh position={position} geometry={geometry} scale={[1, -1, 1]}>
			<meshBasicMaterial color="#10b981" />
		</mesh>
	);
}
