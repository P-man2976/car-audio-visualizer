import { Plane } from "@react-three/drei";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { displayStringAtom } from "@/atoms/display";

const DOT_MATRIX_COL_COUNT = 7;
const DOT_MATRIX_ROW_COUNT = 5;
const DOT_MATRIX_DOT_SIZE = 1.75;
const DOT_MATRIX_DOT_GAP = 0.3;

const DOT_MATRIX_ARRAY_COUNT = 12;
const DOT_MATRIX_ARRAY_GAP = 2;

const LCD_FONT_FAMILY = "LCD5x7_Regular";
const LCD_FONT_SIZE_PX = 30;

/**
 * モジュールロード時に LCD フォントを非同期で先行ロードする。
 * Promise をモジュールスコープに保持するため、複数回ロードされない。
 *
 * @react-three/drei の <Text> は troika-three-text を使用しており、
 * フォントアトラス生成のたびに新しい WebGL コンテキストを作成する。
 * DotMatrix で 12 個の <Text> を使うと ~19 WebGL コンテキストが生成され、
 * Chrome の上限（~16）を超えて Context Lost が発生する。
 * Canvas 2D テクスチャに変更することでこの問題を解消する。
 */
const fontReadyPromise: Promise<void> =
	typeof document !== "undefined"
		? (async () => {
				const ff = new FontFace(LCD_FONT_FAMILY, "url(/LCD5x7_Regular.otf)");
				await ff.load();
				document.fonts.add(ff);
			})().catch(() => {
				/* フォント取得失敗時はシステムフォントで代替 */
			})
		: Promise.resolve();

/**
 * Canvas 2D テクスチャで 1 文字を描画する。
 * - WebGL コンテキストを消費しない
 * - LCD5x7_Regular フォントがロードされるまでシステム等幅フォントで代替
 */
function useCharTexture(char: string): THREE.CanvasTexture | null {
	const [fontLoaded, setFontLoaded] = useState(
		// 同期的に確認できる場合はすぐ true にする
		typeof document !== "undefined" &&
			document.fonts.check(`${LCD_FONT_SIZE_PX}px ${LCD_FONT_FAMILY}`),
	);

	// フォントロード完了後に再レンダリングをトリガー
	// biome-ignore lint/correctness/useExhaustiveDependencies: fontReadyPromise はモジュールスコープの定数
	useEffect(() => {
		if (fontLoaded) return;
		fontReadyPromise.then(() => setFontLoaded(true));
	}, []);

	return useMemo(() => {
		const c = char && char !== " " ? char : "";
		const canvas = document.createElement("canvas");
		canvas.width = 48;
		canvas.height = 48;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;

		ctx.fillStyle = "#67e8f9";
		ctx.font = fontLoaded
			? `${LCD_FONT_SIZE_PX}px ${LCD_FONT_FAMILY}`
			: `${LCD_FONT_SIZE_PX}px monospace`;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		if (c) ctx.fillText(c, 2, 2);

		const tex = new THREE.CanvasTexture(canvas);
		tex.needsUpdate = true;
		return tex;
	}, [char, fontLoaded]);
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
	const texture = useCharTexture(char);

	return (
		<group position={[0, 0, 0]}>
			{/* Canvas 2D テクスチャで文字を描画 — <Text>(troika) の代替 */}
			{texture && (
				<Plane
					position={[
						-DOT_MATRIX_DOT_SIZE + 0.36,
						-DOT_MATRIX_DOT_SIZE * 2 - DOT_MATRIX_DOT_GAP,
						0,
					]}
					args={[
						DOT_MATRIX_DOT_SIZE * DOT_MATRIX_ROW_COUNT,
						DOT_MATRIX_DOT_SIZE * DOT_MATRIX_COL_COUNT,
					]}
				>
					<meshBasicMaterial
						map={texture}
						transparent
						alphaTest={0.05}
						side={THREE.FrontSide}
					/>
				</Plane>
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
