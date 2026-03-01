#!/usr/bin/env node
/**
 * WOFF / TTF / OTF  →  three.js typeface.js JSON converter
 *
 * 用途:
 *   Three.js の FontLoader / TextGeometry が要求する typeface.js 形式の
 *   JSON ファイルをフォントファイルから生成する。
 *
 * 前提条件:
 *   opentype.js が利用できること。
 *   初回のみ以下で一時インストール:
 *     npm install --prefix /tmp/font-convert opentype.js
 *
 * 使い方:
 *   node scripts/convert-font.mjs <fontFile> <outputJson>
 *
 * 例:
 *   # Montserrat 600
 *   curl -sL "https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.woff" \
 *     -o /tmp/montserrat-600.woff
 *   node scripts/convert-font.mjs /tmp/montserrat-600.woff public/montserrat-600.typeface.json
 *
 *   # LCD5x7_Regular
 *   node scripts/convert-font.mjs public/LCD5x7_Regular.otf public/lcd5x7.typeface.json
 *
 * 注意:
 *   glyph.getPath(0, 0, size) は Y 座標をスクリーン用に反転（Y 下向き）するため
 *   Three.js で穴付きグリフ（0/6/8 等）のワインディング順序が崩れる。
 *   本スクリプトでは glyph.path.commands（生フォントユニット, Y 上向き）を
 *   resolution/unitsPerEm でスケールするだけに留め、Y を反転しない。
 */

import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);

// opentype.js を動的に探す
let opentype;
for (const candidate of [
	"opentype.js", // プロジェクトの node_modules にある場合
	"/tmp/font-convert/node_modules/opentype.js", // 一時インストール
]) {
	try {
		opentype = require(candidate);
		break;
	} catch {
		// 次の候補へ
	}
}
if (!opentype) {
	console.error(
		"opentype.js が見つかりません。\n" +
			"  npm install --prefix /tmp/font-convert opentype.js\n" +
			"を実行してから再試行してください。",
	);
	process.exit(1);
}

const fontPath = process.argv[2];
const outPath = process.argv[3];

if (!fontPath || !outPath) {
	console.error("Usage: node scripts/convert-font.mjs <fontFile> <outputJson>");
	process.exit(1);
}

const font = opentype.loadSync(fontPath);
const resolution = 1000;
const scale = resolution / font.unitsPerEm;

const glyphChars =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

const glyphs = {};
for (const ch of glyphChars) {
	const glyph = font.charToGlyph(ch);
	if (!glyph) continue;

	const parts = [];
	// glyph.path.commands は生フォントユニット座標（Y 上向き）。
	// Three.js FontLoader は Y 上向き座標を期待するため Y を反転しない。
	// これにより穴付きグリフ（0 / 6 / 8 等）のワインディング順序が正しく保たれる。
	for (const cmd of glyph.path.commands) {
		const f = (v) => (v * scale).toFixed(2);
		switch (cmd.type) {
			case "M":
				parts.push(`m ${f(cmd.x)} ${f(cmd.y)} `);
				break;
			case "L":
				parts.push(`l ${f(cmd.x)} ${f(cmd.y)} `);
				break;
			case "C":
				parts.push(
					`c ${f(cmd.x1)} ${f(cmd.y1)} ${f(cmd.x2)} ${f(cmd.y2)} ${f(cmd.x)} ${f(cmd.y)} `,
				);
				break;
			case "Q":
				parts.push(`q ${f(cmd.x1)} ${f(cmd.y1)} ${f(cmd.x)} ${f(cmd.y)} `);
				break;
			case "Z":
				parts.push("z ");
				break;
		}
	}

	const adv =
		glyph.advanceWidth != null
			? Math.round(glyph.advanceWidth * scale)
			: resolution;
	glyphs[ch] = {
		ha: adv,
		x_min: Math.round((glyph.xMin || 0) * scale),
		x_max: Math.round((glyph.xMax || 0) * scale),
		o: parts.join(""),
	};
}

const output = {
	glyphs,
	familyName: font.names.fontFamily?.en || "Unknown",
	ascender: Math.round(font.ascender * scale),
	descender: Math.round(font.descender * scale),
	underlinePosition: Math.round(
		(font.tables.post?.underlinePosition || -100) * scale,
	),
	underlineThickness: Math.round(
		(font.tables.post?.underlineThickness || 50) * scale,
	),
	boundingBox: {
		xMin: font.tables.head.xMin,
		xMax: font.tables.head.xMax,
		yMin: font.tables.head.yMin,
		yMax: font.tables.head.yMax,
	},
	resolution,
	original_font_information: {
		family: font.names.fontFamily?.en,
		subfamily: font.names.fontSubfamily?.en,
	},
	cssFontStyle: "normal",
	cssFontWeight: "400",
};

fs.writeFileSync(outPath, JSON.stringify(output));
console.log(`Written to ${outPath}, glyphs: ${Object.keys(glyphs).length}`);
