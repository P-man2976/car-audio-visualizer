/**
 * DotMatrix ビットマップレンダラー (React Three Fiber / InstancedMesh)
 *
 * FONT_5X7 ビットマスクデータから各ドットの ON/OFF を判定し、
 * 単一の InstancedMesh で 12文字 × 5列 × 7行 = 420 ドットを描画する。
 *
 * 従来の TextGeometry + typeface JSON アプローチと異なり、
 * 実際の LCD ドットマトリクスのように個別のドットが点灯/消灯する。
 */
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { displayStringAtom } from "@/atoms/display";
import { FONT_5X7 } from "@/lib/dotmatrix-font";

/** ドットマトリクスフォントの列数 */
const DOT_COLS = 5;
/** ドットマトリクスフォントの行数 */
const DOT_ROWS = 7;
/** 表示文字数 */
const CHAR_COUNT = 12;
/** 1ドットの辺の長さ */
const DOT_SIZE = 1.75;
/** ドット間の隙間 */
const DOT_GAP = 0.3;
/** 文字間の追加隙間 */
const CHAR_GAP = 2;

/** 全ドット数 (12 × 7 × 5 = 420) */
const TOTAL_DOTS = CHAR_COUNT * DOT_ROWS * DOT_COLS;

/** 点灯色 (シアン #67e8f9) */
const COLOR_ACTIVE = new THREE.Color(0x67e8f9);
/** 消灯色 (ダークパープル #3b0764) */
const COLOR_INACTIVE = new THREE.Color(0x3b0764);

/** 共有ジオメトリ — 全インスタンスで再利用 */
const sharedGeometry = new THREE.PlaneGeometry(DOT_SIZE, DOT_SIZE);
/** 共有マテリアル — vertexColors を使ってインスタンスごとに色を変える */
const sharedMaterial = new THREE.MeshBasicMaterial();

/** 1文字の幅（ドット中心間） */
const CHAR_W = DOT_COLS * DOT_SIZE + (DOT_COLS - 1) * DOT_GAP;
/** 全体の幅 */
const TOTAL_W = CHAR_COUNT * CHAR_W + (CHAR_COUNT - 1) * CHAR_GAP;

/**
 * 12文字の DotMatrix ディスプレイ。
 * displayStringAtom の値を FONT_5X7 ビットマスクで描画する。
 *
 * @param y - ディスプレイの Y 座標（グループ配置）
 */
export function DotMatrixArray({ y = 40 }: { y?: number }) {
	const displayString = useAtomValue(displayStringAtom);
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
	const tempColor = useMemo(() => new THREE.Color(), []);

	// インスタンス位置を一度だけ設定する
	useEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		const startX = -TOTAL_W / 2;
		let idx = 0;

		for (let ci = 0; ci < CHAR_COUNT; ci++) {
			const charX = startX + ci * (CHAR_W + CHAR_GAP);
			for (let row = 0; row < DOT_ROWS; row++) {
				for (let col = 0; col < DOT_COLS; col++) {
					const x = charX + col * (DOT_SIZE + DOT_GAP);
					// row 0 = 上端 → Y が大きい方に配置
					const yPos = (DOT_ROWS - 1 - row) * (DOT_SIZE + DOT_GAP);
					tempMatrix.makeTranslation(x, yPos, 0);
					mesh.setMatrixAt(idx, tempMatrix);
					mesh.setColorAt(idx, COLOR_INACTIVE);
					idx++;
				}
			}
		}

		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	}, [tempMatrix]);

	// displayString が変化したらドット色を更新する
	useEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		let idx = 0;
		for (let ci = 0; ci < CHAR_COUNT; ci++) {
			const ch = displayString[ci] ?? " ";
			const bitmap = FONT_5X7[ch] ?? FONT_5X7[" "];
			for (let row = 0; row < DOT_ROWS; row++) {
				const rowBits = bitmap![row]!;
				for (let col = 0; col < DOT_COLS; col++) {
					const isOn = (rowBits >> (DOT_COLS - 1 - col)) & 1;
					tempColor.copy(isOn ? COLOR_ACTIVE : COLOR_INACTIVE);
					mesh.setColorAt(idx, tempColor);
					idx++;
				}
			}
		}

		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	}, [displayString, tempColor]);

	return (
		<group position={[0, y, 0]}>
			<instancedMesh
				ref={meshRef}
				args={[sharedGeometry, sharedMaterial, TOTAL_DOTS]}
				frustumCulled={false}
			/>
		</group>
	);
}
