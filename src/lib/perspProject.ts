/**
 * Orthographic カメラ向けの手動パースペクティブ射影ユーティリティ。
 * セルの位置をフラットグリッドから台形レイアウトに変換し、傾斜を表現する。
 * 2D PixiJS ビジュアライザーの project() と同等の数学。
 */

/** パースペクティブ射影パラメータ */
export interface PerspParams {
	/** 消失点 X（グリッド中心） */
	cx: number;
	/** 消失点 Y（グリッド中心） */
	cy: number;
	/** パースペクティブ距離（大きいほど遠近感が弱い） */
	dist: number;
	/** sin(tiltDeg) キャッシュ */
	sin: number;
	/** cos(tiltDeg) キャッシュ */
	cos: number;
}

/**
 * パースペクティブパラメータを生成する。
 * @param cx 消失点 X（通常はグリッド中心X）
 * @param cy 消失点 Y（通常はグリッド中心Y）
 * @param dist パースペクティブ距離
 * @param tiltDeg X軸まわりの傾斜角度（度）
 */
export function createPerspParams(
	cx: number,
	cy: number,
	dist: number,
	tiltDeg: number,
): PerspParams {
	const rad = (tiltDeg * Math.PI) / 180;
	return { cx, cy, dist, sin: Math.sin(rad), cos: Math.cos(rad) };
}

/**
 * フラット座標 (x, y) をパースペクティブ射影する。
 * Y が大きい（上方向）ほど奥に見え（縮小）、小さいほど手前に見える（拡大）。
 * @returns px: 射影後 X, py: 射影後 Y, s: スケール係数
 */
export function perspProject(
	x: number,
	y: number,
	p: PerspParams,
): { px: number; py: number; s: number } {
	const dy = y - p.cy;
	const z = dy * p.sin;
	const s = p.dist / (p.dist + z);
	return {
		px: p.cx + (x - p.cx) * s,
		py: p.cy + dy * p.cos * s,
		s,
	};
}
