import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { createPerspParams, perspProject } from "@/lib/perspProject";
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
const COL_CELL_COUNT = 32;
const ROW_CELL_GAP = 2;
const COL_CELL_GAP = 0.6;
const ANALYZER_ANGLE_DEGREE = 24;
/** 周波数バンド数（ANSI 1/3-octave から 9 バンド選択） */
const FREQ_COUNT = 9;

const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 25, 28] as const;
const FREQ_ARRAY = ["60", "120", "250", "500", "1k", "2k", "4k", "8k", "16k"];

// ─── Position helpers ─────────────────────────────────────────────────────────
/** 列 1 本分のストライド */
const COL_STRIDE = CELL_WIDTH + ROW_CELL_GAP;
/** 左列の X 位置（元 rowIndex = fi*2 と同一座標） */
const leftCX = (fi: number) => COL_STRIDE * (fi * 2) + ROW_CELL_GAP;
/** 右列の X 位置（元 rowIndex = fi*2+1 と同一座標） */
const rightCX = (fi: number) => COL_STRIDE * (fi * 2 + 1) + ROW_CELL_GAP;
/** セルの Y 位置 */
const cellY = (ci: number) => (CELL_HEIGHT + COL_CELL_GAP) * ci + COL_CELL_GAP;

// ─── Perspective projection (台形レイアウト) ───────────────────────────────────
/** グリッド中心 X: 左端列中心と右端列中心の中点 */
const GRID_CX = (leftCX(0) + rightCX(FREQ_COUNT - 1)) / 2;
/** グリッド中心 Y */
const GRID_CY = (cellY(0) + cellY(COL_CELL_COUNT - 1)) / 2;
/** パースペクティブ射影パラメータ */
const PERSP = createPerspParams(GRID_CX, GRID_CY, 50, ANALYZER_ANGLE_DEGREE);

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

	return (
		<group position={[-GRID_CX, -GRID_CY, 0]} scale={1.6}>
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => {
				const lineY = -2;
				const lStart = perspProject(
					COL_STRIDE * (fi * 2) - ROW_CELL_GAP / 2 + 0.3,
					lineY,
					PERSP,
				);
				const lEnd = perspProject(
					COL_STRIDE * (fi * 2) - ROW_CELL_GAP / 2 + CELL_WIDTH - 2,
					lineY,
					PERSP,
				);
				const rStart = perspProject(
					COL_STRIDE * (fi * 2 + 1) - ROW_CELL_GAP / 2 + 2,
					lineY,
					PERSP,
				);
				const rEnd = perspProject(
					COL_STRIDE * (fi * 2 + 1) - ROW_CELL_GAP / 2 + CELL_WIDTH - 0.3,
					lineY,
					PERSP,
				);
				const labelPos = perspProject(
					COL_STRIDE * (fi * 2 + 1) - ROW_CELL_GAP,
					lineY,
					PERSP,
				);
				return (
					<group key={`band-${fi}`}>
						<BandInstanced fi={fi} />
						<Line
							points={[
								[lStart.px, lStart.py, 0],
								[lEnd.px, lEnd.py, 0],
							]}
							lineWidth={4}
							color="#67e8f9"
						/>
						<Line
							points={[
								[rStart.px, rStart.py, 0],
								[rEnd.px, rEnd.py, 0],
							]}
							lineWidth={4}
							color="#67e8f9"
						/>
						<FrequencyLabel
							label={FREQ_ARRAY[fi]}
							position={[labelPos.px, labelPos.py, 0]}
						/>
					</group>
				);
			})}
		</group>
	);
}

// ─── InstancedMesh per band: 32 cells × 2 planes = 64 instances ──────────────
/** 共有ジオメトリ — 全バンド共通の PlaneGeometry */
const sharedGeometry = new THREE.PlaneGeometry(CELL_WIDTH, CELL_HEIGHT);
/** インスタンス数 = セル数 × 左右 2 面 */
const INSTANCES_PER_BAND = COL_CELL_COUNT * 2;

function BandInstanced({ fi }: { fi: number }) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const color = useMemo(() => new THREE.Color(), []);

	// 初回マウント時にインスタンスの位置（行列）とデフォルト色を設定
	useEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const mat = new THREE.Matrix4();
		const dark = new THREE.Color("#3b0764");
		for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
			const flatY = cellY(ci);
			// 左列: index = ci * 2
			const l = perspProject(leftCX(fi), flatY, PERSP);
			mat.makeScale(l.s, l.s, 1);
			mat.setPosition(l.px, l.py, 0);
			mesh.setMatrixAt(ci * 2, mat);
			mesh.setColorAt(ci * 2, dark);
			// 右列: index = ci * 2 + 1
			const r = perspProject(rightCX(fi), flatY, PERSP);
			mat.makeScale(r.s, r.s, 1);
			mat.setPosition(r.px, r.py, 0);
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
				(ci - 2 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci - 1);

			color.set(
				isPeak
					? "#3b82f6"
					: value * COL_CELL_COUNT > ci
						? "#a5f3fc"
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
			args={[sharedGeometry, undefined, INSTANCES_PER_BAND]}
			frustumCulled={false}
		>
			<meshStandardMaterial />
		</instancedMesh>
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
