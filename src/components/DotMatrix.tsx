import { Plane } from "@react-three/drei";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { displayStringAtom } from "@/atoms/display";

const DOT_MATRIX_COL_COUNT = 7;
const DOT_MATRIX_ROW_COUNT = 5;
const DOT_MATRIX_DOT_SIZE = 1.75;
const DOT_MATRIX_DOT_GAP = 0.3;

const DOT_MATRIX_ARRAY_COUNT = 12;
const DOT_MATRIX_ARRAY_GAP = 2;

/** TextGeometry に渡す文字サイズ。7ドット高 + ベースラインマージン */
const CHAR_SIZE = DOT_MATRIX_DOT_SIZE * DOT_MATRIX_COL_COUNT + 4;

// ─── LCD5x7 font singleton ────────────────────────────────────────────────────
const _lcdFontLoader = new FontLoader();
let _lcdFont: Font | null = null;
const _lcdFontReady: Promise<Font> = fetch("/lcd5x7.typeface.json")
	.then((r) => r.json())
	.then((data) => {
		_lcdFont = _lcdFontLoader.parse(data);
		return _lcdFont;
	});

/**
 * 基準セル BBox — 全文字のセンタリングに使用する。
 * LCD5x7 フォントはモノスペースのため、フルセル文字 (M) の
 * BoundingBox を基準にすることで、文字サイズに依存しない一貫した配置となる。
 * font ロード完了後に一度だけ計算する。
 */
let _refCenter: THREE.Vector3 | null = null;
function getRefCenter(font: Font): THREE.Vector3 {
	if (_refCenter) return _refCenter;
	const g = new TextGeometry("M", {
		font,
		size: CHAR_SIZE,
		depth: 0,
		curveSegments: 4,
		bevelEnabled: false,
	});
	g.computeBoundingBox();
	_refCenter = new THREE.Vector3();
	g.boundingBox!.getCenter(_refCenter);
	g.dispose();
	return _refCenter;
}

export function DotMatrixArray({ y = 40 }: { y?: number }) {
	const displayString = useAtomValue(displayStringAtom);

	return (
		<group
			position={[
				-(
					(DOT_MATRIX_DOT_SIZE * DOT_MATRIX_ROW_COUNT +
						DOT_MATRIX_DOT_GAP * (DOT_MATRIX_ROW_COUNT - 1)) *
						DOT_MATRIX_ARRAY_COUNT +
					DOT_MATRIX_ARRAY_GAP * (DOT_MATRIX_ARRAY_COUNT - 1)
				) / 2,
				y,
				0,
			]}
		>
			{Array.from({ length: DOT_MATRIX_ARRAY_COUNT }).map((_, index) => (
				<group
					key={`dot-matrix-${index}`}
					position={[
						index *
							DOT_MATRIX_ROW_COUNT *
							(DOT_MATRIX_DOT_GAP + DOT_MATRIX_DOT_SIZE) +
							DOT_MATRIX_ARRAY_GAP * index,
						0,
						0,
					]}
				>
					<DotMatrix char={displayString[index] ?? " "} />
				</group>
			))}
		</group>
	);
}

function DotMatrix({ char }: { char: string }) {
	const [font, setFont] = useState<Font | null>(_lcdFont);

	useEffect(() => {
		if (_lcdFont) {
			setFont(_lcdFont);
			return;
		}
		_lcdFontReady.then(setFont);
	}, []);

	// ドットグリッド中心 (TextGeometry の g.center() と合わせるため)
	const centerX =
		((DOT_MATRIX_ROW_COUNT - 1) * (DOT_MATRIX_DOT_SIZE + DOT_MATRIX_DOT_GAP)) /
		2;
	const centerY =
		((DOT_MATRIX_COL_COUNT - 1) * (DOT_MATRIX_DOT_SIZE + DOT_MATRIX_DOT_GAP)) /
		2;

	const geometry = useMemo(() => {
		if (!font || !char || char === " ") return null;
		const g = new TextGeometry(char, {
			font,
			size: CHAR_SIZE,
			depth: 0,
			curveSegments: 4,
			bevelEnabled: false,
		});
		g.computeBoundingBox();
		// 基準セル (M) の中心を使って全文字を統一的にセンタリングする。
		// g.center() は個別グリフの BBox を使うため、小さい文字 (`.`, `c` 等) がずれる。
		const ref = getRefCenter(font);
		g.translate(-ref.x, -ref.y, -ref.z);
		return g;
	}, [font, char]);

	return (
		<group position={[0, 0, 0]}>
			{/* TextGeometry で LCD5x7 文字を描画 */}
			{geometry && (
				<mesh position={[centerX, centerY, 0.01]} geometry={geometry}>
					<meshBasicMaterial color="#67e8f9" />
				</mesh>
			)}
			{Array.from({ length: DOT_MATRIX_ROW_COUNT }).map((_, rowIndex) =>
				Array.from({ length: DOT_MATRIX_COL_COUNT }).map((__, colIndex) => (
					<Plane
						key={`${rowIndex}-${colIndex}`}
						position={[
							(DOT_MATRIX_DOT_SIZE + DOT_MATRIX_DOT_GAP) * rowIndex,
							(DOT_MATRIX_DOT_SIZE + DOT_MATRIX_DOT_GAP) * colIndex,
							0,
						]}
						args={[DOT_MATRIX_DOT_SIZE, DOT_MATRIX_DOT_SIZE]}
						material-color="#3b0764"
					/>
				)),
			)}
		</group>
	);
}
