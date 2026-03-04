#!/usr/bin/env node
/**
 * lcd5x7.typeface.json → dotmatrix-font.ts 変換スクリプト
 *
 * LCD5x7_Regular.otf から生成された Three.js typeface JSON を読み込み、
 * 各グリフの矩形座標を 5×7 グリッド上のセル位置に変換し、
 * ビットマップ配列 (7 行 × 5 ビット) として TypeScript 定数を出力する。
 *
 * 使い方:
 *   node scripts/extract-lcd-bitmap.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, "../public/lcd5x7.typeface.json");
const outPath = path.resolve(__dirname, "../src/lib/dotmatrix-font.ts");

const font = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

// Grid X positions (column 0..4) — determined from the font's coordinate system
const COL_XS = [42.84, 169.57, 296.29, 423.02, 549.74];
// Grid Y positions (row 0=top..6=bottom) — Y in font is y-up, so highest Y = top row
const ROW_YS = [760.35, 633.62, 506.90, 380.17, 253.45, 126.72, 0.0];

const TOLERANCE = 20; // matching tolerance

function findCol(x) {
	for (let c = 0; c < COL_XS.length; c++) {
		if (Math.abs(x - COL_XS[c]) < TOLERANCE) return c;
	}
	return -1;
}

function findRow(y) {
	for (let r = 0; r < ROW_YS.length; r++) {
		if (Math.abs(y - ROW_YS[r]) < TOLERANCE) return r;
	}
	return -1;
}

/**
 * Parse the "o" field (rectangle outlines) and return the active cells
 * as a 7-element array of 5-bit integers.
 */
function parseBitmap(outline) {
	const rows = [0, 0, 0, 0, 0, 0, 0];
	if (!outline) return rows;

	// Each rectangle: "m x y l x2 y l x2 y2 l x y2 z"
	// We extract the first "m x y" of each rectangle
	const re = /m\s+([\d.]+)\s+([\d.]+)/g;
	let match;
	while ((match = re.exec(outline)) !== null) {
		const x = parseFloat(match[1]);
		const y = parseFloat(match[2]);
		const col = findCol(x);
		const row = findRow(y);
		if (col >= 0 && row >= 0) {
			rows[row] |= 1 << (4 - col); // MSB = left column
		}
	}
	return rows;
}

// Build the bitmap map
const bitmaps = {};
for (const [ch, glyph] of Object.entries(font.glyphs)) {
	bitmaps[ch] = parseBitmap(glyph.o);
}

// Generate TypeScript source
const lines = [];
lines.push(`/**`);
lines.push(` * LCD 5×7 ドットマトリクスフォント ビットマップデータ`);
lines.push(` *`);
lines.push(` * LCD5x7_Regular.otf から自動生成。`);
lines.push(` * scripts/extract-lcd-bitmap.mjs で再生成可能。`);
lines.push(` *`);
lines.push(` * 各エントリは 7 要素の number[] で、行 0 (上) → 行 6 (下)。`);
lines.push(` * 各値は 5 ビット幅で、MSB (bit 4) = 左端ドット。`);
lines.push(` */`);
lines.push(``);
lines.push(`/** 5×7 DotMatrix bitmap font (auto-generated from LCD5x7_Regular.otf) */`);
lines.push(`export const FONT_5X7: Record<string, number[]> = {`);

// Sort keys for deterministic output
const sortedKeys = Object.keys(bitmaps).sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));

for (const ch of sortedKeys) {
	const rows = bitmaps[ch];
	const escaped = ch === '"' ? '\\"' : ch === "\\" ? "\\\\" : ch;
	const rowsStr = rows.map((r) => `0b${r.toString(2).padStart(5, "0")}`).join(", ");
	lines.push(`\t"${escaped}": [${rowsStr}],`);
}

lines.push(`};`);
lines.push(``);

fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
console.log(`Wrote ${sortedKeys.length} glyphs to ${outPath}`);
