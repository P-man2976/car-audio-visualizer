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

// ─── Quad helpers for BufferGeometry ──────────────────────────────────────────

/**
 * セルの 4 頂点をパースペクティブ射影して positions 配列に書き込む。
 * 頂点順: bottom-left → bottom-right → top-right → top-left
 */
export function writePerspQuad(
	positions: Float32Array,
	cellIdx: number,
	cx: number,
	cy: number,
	halfW: number,
	halfH: number,
	persp: PerspParams,
): void {
	const base = cellIdx * 12;
	const bl = perspProject(cx - halfW, cy - halfH, persp);
	const br = perspProject(cx + halfW, cy - halfH, persp);
	const tr = perspProject(cx + halfW, cy + halfH, persp);
	const tl = perspProject(cx - halfW, cy + halfH, persp);
	positions[base] = bl.px;
	positions[base + 1] = bl.py;
	positions[base + 2] = 0;
	positions[base + 3] = br.px;
	positions[base + 4] = br.py;
	positions[base + 5] = 0;
	positions[base + 6] = tr.px;
	positions[base + 7] = tr.py;
	positions[base + 8] = 0;
	positions[base + 9] = tl.px;
	positions[base + 10] = tl.py;
	positions[base + 11] = 0;
}

/**
 * クアッドのインデックス（2 三角形 = 6 indices）を書き込む。
 */
export function writeQuadIndices(indices: Uint16Array, cellIdx: number): void {
	const bvi = cellIdx * 4;
	const bii = cellIdx * 6;
	indices[bii] = bvi;
	indices[bii + 1] = bvi + 1;
	indices[bii + 2] = bvi + 2;
	indices[bii + 3] = bvi;
	indices[bii + 4] = bvi + 2;
	indices[bii + 5] = bvi + 3;
}

/**
 * クアッドの 4 頂点に同一色を設定する。
 */
export function fillQuadColor(
	colors: Float32Array,
	cellIdx: number,
	r: number,
	g: number,
	b: number,
): void {
	const base = cellIdx * 12;
	for (let v = 0; v < 4; v++) {
		colors[base + v * 3] = r;
		colors[base + v * 3 + 1] = g;
		colors[base + v * 3 + 2] = b;
	}
}

/**
 * 射影後のグリッド中心 Y を求める（グループ位置計算用）。
 */
export function projectedCenterY(
	yMin: number,
	yMax: number,
	persp: PerspParams,
): number {
	const pMin = perspProject(persp.cx, yMin, persp);
	const pMax = perspProject(persp.cx, yMax, persp);
	return (pMin.py + pMax.py) / 2;
}
