import { Plane } from "@react-three/drei";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { displayStringAtom } from "@/atoms/display";

const DOT_MATRIX_COL_COUNT = 7;
const DOT_MATRIX_ROW_COUNT = 5;
const DOT_MATRIX_DOT_SIZE = 1.75;
const DOT_MATRIX_DOT_GAP = 0.3;

const DOT_MATRIX_ARRAY_COUNT = 12;
const DOT_MATRIX_ARRAY_GAP = 2;

// ─── LCD5x7 font singleton ────────────────────────────────────────────────────
// Montserrat と同方式: typeface.js JSON をモジュールロード時に先行取得し、
// TextGeometry で各文字を描画する。追加 WebGL コンテキストを消費しない。
const _lcdFontLoader = new FontLoader();
let _lcdFont: Font | null = null;
const _lcdFontReady: Promise<Font> = fetch("/lcd5x7.typeface.json")
	.then((r) => r.json())
	.then((data) => {
		_lcdFont = _lcdFontLoader.parse(data);
		return _lcdFont;
	});

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
			// COL_COUNT (7行) × DOT_SIZE がキャラクタ高さに相当するサイズ
			size: DOT_MATRIX_DOT_SIZE * DOT_MATRIX_COL_COUNT + 4,
			depth: 0,
			// LCD フォントは直線グリフのみのため curveSegments: 4 で十分
			curveSegments: 4,
			bevelEnabled: false,
		});
		g.computeBoundingBox();
		g.center();
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
