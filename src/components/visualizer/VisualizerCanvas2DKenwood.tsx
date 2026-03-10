/**
 * DPX-5021M 2D ビジュアライザー（PixiJS / @pixi/react）
 *
 * 3D 版 VisualizerKenwood + VisualizerKenwoodSub + DotMatrix を
 * PixiJS で 2D 描画する。各セルはパースペクティブ射影で台形に変形し、
 * 3D 風傾斜を表現する。
 *
 * レイアウト（上→下）:
 *   DotMatrix → Main bars → Sub bars + Wings
 */
import { Application, extend, useApplication, useTick } from "@pixi/react";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { Container, Graphics } from "pixi.js";
import { useRef } from "react";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { displayStringAtom } from "@/atoms/display";
import { pinchZoomAtom } from "@/atoms/visualizerZoom";
import { useSteppedBars } from "@/hooks/useSteppedBars";
import { FONT_5X7 } from "@/lib/dotmatrix-font";

// ─── PixiJS extend ──────────────────────────────────────────────────────────
extend({ Container, Graphics });

// ═══════════════════════════════════════════════════════════════════════════
// 定数 — Main visualizer（VisualizerKenwood.tsx 準拠）
// ═══════════════════════════════════════════════════════════════════════════
const MAIN_FREQ_COUNT = 11;
const MAIN_COL_CELL_COUNT = 26;
const MAIN_CELL_HEIGHT = 0.6;
const MAIN_COL_CELL_GAP = 0.8;
const MAIN_TILT_DEG = 28;

const MAIN_SUB_COL_WIDTH = 3;
const MAIN_SUB_COL_GAP = 0.5;
const MAIN_BAR_WIDTH = MAIN_SUB_COL_WIDTH * 2 + MAIN_SUB_COL_GAP; // 6.5
const MAIN_SIDE_BAR_WIDTH = 0.4;
const MAIN_SIDE_GAP = 0.5;
const MAIN_SIDE_UNIT = MAIN_SIDE_BAR_WIDTH + MAIN_SIDE_GAP; // 0.9
const MAIN_BAND_GAP = 1.6;
const MAIN_BAND_STRIDE =
	MAIN_SIDE_UNIT +
	MAIN_BAR_WIDTH +
	MAIN_SIDE_GAP +
	MAIN_SIDE_BAR_WIDTH +
	MAIN_BAND_GAP; // 9.9

const MAIN_BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 24, 25, 27, 28] as const;

// ═══════════════════════════════════════════════════════════════════════════
// 定数 — Sub visualizer（VisualizerKenwoodSub.tsx 準拠）
// ═══════════════════════════════════════════════════════════════════════════
const SUB_FREQ_COUNT = 10;
const SUB_COL_CELL_COUNT = 7;
const SUB_CELL_HEIGHT = 0.4;
const SUB_COL_CELL_GAP = 0.6;
const SUB_TILT_DEG = 32;

const SUB_COL_WIDTH = 2.2;
const SUB_COL_GAP = 0.4;
const SUB_BAR_WIDTH = SUB_COL_WIDTH * 2 + SUB_COL_GAP; // 4.8
const SUB_BAND_GAP = 1.4;
const SUB_BAND_STRIDE = SUB_BAR_WIDTH + SUB_BAND_GAP; // 6.2

const SUB_BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 24, 27, 28] as const;

// Wing bar dimensions
const WING_MAX_LOCAL_WIDTH = 22;
const WING_MIN_LOCAL_WIDTH = 18.5;
const WING_GAP = 1;

// ═══════════════════════════════════════════════════════════════════════════
// DotMatrix 定数
// ═══════════════════════════════════════════════════════════════════════════
const DOT_COLS = 5;
const DOT_ROWS = 7;
const DOT_CHAR_COUNT = 12;
const DOT_SCALE = 0.85;

// ═══════════════════════════════════════════════════════════════════════════
// カラー
// ═══════════════════════════════════════════════════════════════════════════
const COLOR_LIT = 0x6dceff;
const COLOR_DARK = 0x3b0764;
const COLOR_PEAK = 0xffffff;
const COLOR_SIDE_OFF = 0x91daff;
const COLOR_WING = 0x6dceff;
const COLOR_BG = 0x0a0a0a;
const COLOR_DOT_ACTIVE = 0x67e8f9;
const COLOR_DOT_INACTIVE = 0x3b0764;

// ═══════════════════════════════════════════════════════════════════════════
// レイアウト比率
// ═══════════════════════════════════════════════════════════════════════════
const PADDING_FRAC = 0.04;
const DOT_FRAC = 0.12;
const MAIN_FRAC = 0.66;
const SUB_FRAC = 0.22;
const SECTION_GAP_FRAC = 0.02;

// ═══════════════════════════════════════════════════════════════════════════
// 派生定数
// ═══════════════════════════════════════════════════════════════════════════

// Main design space
const MAIN_DESIGN_W = MAIN_BAND_STRIDE * MAIN_FREQ_COUNT - MAIN_BAND_GAP; // last band has no trailing gap
const MAIN_DESIGN_H =
	MAIN_COL_CELL_COUNT * MAIN_CELL_HEIGHT +
	(MAIN_COL_CELL_COUNT - 1) * MAIN_COL_CELL_GAP;

// Sub design space
const SUB_BARS_DESIGN_W = SUB_BAND_STRIDE * SUB_FREQ_COUNT - SUB_BAND_GAP;
const SUB_DESIGN_H =
	SUB_COL_CELL_COUNT * SUB_CELL_HEIGHT +
	(SUB_COL_CELL_COUNT - 1) * SUB_COL_CELL_GAP;

// Total design width is the maximum of main or sub+wings
const SUB_TOTAL_W = SUB_BARS_DESIGN_W + 2 * (WING_GAP + WING_MAX_LOCAL_WIDTH);
const DESIGN_TOTAL_W = Math.max(MAIN_DESIGN_W, SUB_TOTAL_W);

// Tilt sin/cos caches
const MAIN_TILT_SIN = Math.sin((MAIN_TILT_DEG * Math.PI) / 180);
const MAIN_TILT_COS = Math.cos((MAIN_TILT_DEG * Math.PI) / 180);
const SUB_TILT_SIN = Math.sin((SUB_TILT_DEG * Math.PI) / 180);
const SUB_TILT_COS = Math.cos((SUB_TILT_DEG * Math.PI) / 180);

// Perspective distance
const PERSPECTIVE_DIST = 50;

// ═══════════════════════════════════════════════════════════════════════════
// Layout calculator
// ═══════════════════════════════════════════════════════════════════════════
interface KenwoodLayout {
	s: number;
	// Main section
	mainOffsetX: number;
	mainOffsetY: number;
	mainW: number;
	mainH: number;
	mainCellH: number;
	// Sub section
	subOffsetX: number;
	subOffsetY: number;
	subW: number;
	subH: number;
	subCellH: number;
	// DotMatrix section
	dotOffsetY: number;
	dotAreaH: number;
	// Screen dimensions
	screenW: number;
	screenH: number;
}

function computeKenwoodLayout(
	w: number,
	h: number,
	zoom: number,
): KenwoodLayout {
	const usableW = w * (1 - PADDING_FRAC * 2);
	const usableH = h * (1 - PADDING_FRAC * 2);

	// Overall design height = dot + gap + main + gap + sub
	const designTotalH =
		MAIN_DESIGN_H * (1 + DOT_FRAC / MAIN_FRAC + SUB_FRAC / MAIN_FRAC) +
		2 * SECTION_GAP_FRAC * usableH;

	// Uniform scale to fit
	const sFromW = usableW / DESIGN_TOTAL_W;
	const sFromH = usableH / designTotalH;
	const s = Math.min(sFromW, sFromH) * zoom;

	const mainW = MAIN_DESIGN_W * s;
	const mainH = MAIN_DESIGN_H * s;
	const subW = SUB_BARS_DESIGN_W * s;
	const subH = SUB_DESIGN_H * s;
	const dotAreaH = mainH * (DOT_FRAC / MAIN_FRAC);
	const sectionGap = SECTION_GAP_FRAC * usableH * zoom;

	const totalH = dotAreaH + sectionGap + mainH + sectionGap + subH;
	const totalW = DESIGN_TOTAL_W * s;

	const baseX = (w - totalW) / 2;
	const baseY = (h - totalH) / 2;

	// DotMatrix at top
	const dotOffsetY = baseY;
	// Main bars below dot
	const mainOffsetY = baseY + dotAreaH + sectionGap;
	const mainOffsetX = baseX + (totalW - mainW) / 2;
	// Sub bars below main
	const subOffsetY = mainOffsetY + mainH + sectionGap;
	const subOffsetX = baseX + (totalW - subW) / 2;

	return {
		s,
		mainOffsetX,
		mainOffsetY,
		mainW,
		mainH,
		mainCellH: MAIN_CELL_HEIGHT * s,
		subOffsetX,
		subOffsetY,
		subW,
		subH,
		subCellH: SUB_CELL_HEIGHT * s,
		dotOffsetY,
		dotAreaH,
		screenW: w,
		screenH: h,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Perspective projection helpers
// ═══════════════════════════════════════════════════════════════════════════

/** 再利用バッファ — drawPerspRectSection 1回で 8 要素使用 */
const _polyBuf = new Float64Array(8);

/** Project a point with given tilt parameters, writing to output buffer */
function projectSectionTo(
	out: Float64Array,
	offset: number,
	x: number,
	y: number,
	cx: number,
	cy: number,
	tiltSin: number,
	tiltCos: number,
	perspDist: number,
): void {
	const dy = y - cy;
	const z = -dy * tiltSin;
	const sc = perspDist / (perspDist + z);
	out[offset] = cx + (x - cx) * sc;
	out[offset + 1] = cy + dy * tiltCos * sc;
}

/** Draw a perspective-projected quad */
function drawPerspRectSection(
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	cx: number,
	cy: number,
	tiltSin: number,
	tiltCos: number,
	perspDist: number,
	color: number,
): void {
	projectSectionTo(_polyBuf, 0, x, y, cx, cy, tiltSin, tiltCos, perspDist);
	projectSectionTo(_polyBuf, 2, x + w, y, cx, cy, tiltSin, tiltCos, perspDist);
	projectSectionTo(
		_polyBuf,
		4,
		x + w,
		y + h,
		cx,
		cy,
		tiltSin,
		tiltCos,
		perspDist,
	);
	projectSectionTo(_polyBuf, 6, x, y + h, cx, cy, tiltSin, tiltCos, perspDist);
	g.moveTo(_polyBuf[0], _polyBuf[1]);
	g.lineTo(_polyBuf[2], _polyBuf[3]);
	g.lineTo(_polyBuf[4], _polyBuf[5]);
	g.lineTo(_polyBuf[6], _polyBuf[7]);
	g.closePath();
	g.fill(color);
}

// ═══════════════════════════════════════════════════════════════════════════
// Root wrapper (exported)
// ═══════════════════════════════════════════════════════════════════════════
export function VisualizerCanvas2DKenwood() {
	const containerRef = useRef<HTMLDivElement>(null);

	return (
		<div ref={containerRef} className="absolute inset-0 h-full w-full">
			<Application
				resizeTo={containerRef}
				background={COLOR_BG}
				antialias
				autoDensity
				resolution={window.devicePixelRatio || 1}
			>
				<KenwoodScene />
			</Application>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// Inner scene
// ═══════════════════════════════════════════════════════════════════════════
function KenwoodScene() {
	const audioMotion = useAtomValue(audioMotionAnalyzerAtom);
	const displayString = useAtomValue(displayStringAtom);
	const pinchZoom = useAtomValue(pinchZoomAtom);
	const processBars = useSteppedBars();
	const displayRef = useRef(displayString);
	displayRef.current = displayString;

	const { app } = useApplication();
	const barsRef = useRef<AnalyzerBarData[]>([]);
	const gRef = useRef<Graphics | null>(null);

	useTick(() => {
		if (audioMotion.isOn) {
			const bars = processBars(
				() => audioMotion.getBars() as AnalyzerBarData[],
			);
			if (bars) barsRef.current = bars;
		}

		const g = gRef.current;
		if (!g) return;

		g.clear();
		const w = app.screen.width;
		const h = app.screen.height;
		if (w === 0 || h === 0) return;

		const layout = computeKenwoodLayout(w, h, pinchZoom);
		const bars = barsRef.current;
		const pd = PERSPECTIVE_DIST * layout.s;

		// ─── Main bars section ────────────────────────────────────
		const mainCX = layout.mainOffsetX + layout.mainW / 2;
		const mainCY = layout.mainOffsetY + layout.mainH / 2;

		for (let fi = 0; fi < MAIN_FREQ_COUNT; fi++) {
			const freqLevel = bars?.[MAIN_BAND_INDICES[fi]];
			const value = freqLevel?.value?.[0] ?? 0;
			const peak = freqLevel?.peak?.[0] ?? 0;

			// Band X positions within design space, then offset to screen
			const bandBaseX = layout.mainOffsetX + MAIN_BAND_STRIDE * fi * layout.s;
			const sideLeftX = bandBaseX;
			const mainLeftX = bandBaseX + MAIN_SIDE_UNIT * layout.s;
			const mainRightX =
				mainLeftX + (MAIN_SUB_COL_WIDTH + MAIN_SUB_COL_GAP) * layout.s;
			const sideRightX =
				bandBaseX +
				(MAIN_SIDE_UNIT + MAIN_BAR_WIDTH + MAIN_SIDE_GAP) * layout.s;

			const mainColW = MAIN_SUB_COL_WIDTH * layout.s;
			const sideW = MAIN_SIDE_BAR_WIDTH * layout.s;
			const cellH = layout.mainCellH;

			for (let ci = 0; ci < MAIN_COL_CELL_COUNT; ci++) {
				const y =
					layout.mainOffsetY +
					layout.mainH -
					(ci + 1) * cellH -
					ci * MAIN_COL_CELL_GAP * layout.s;

				const isPeak =
					(ci < peak * MAIN_COL_CELL_COUNT &&
						peak * MAIN_COL_CELL_COUNT < ci + 1) ||
					(ci - 1 < peak * MAIN_COL_CELL_COUNT &&
						peak * MAIN_COL_CELL_COUNT < ci);

				// Main bars (left + right)
				const mainColor = isPeak
					? COLOR_PEAK
					: value * MAIN_COL_CELL_COUNT > ci
						? COLOR_LIT
						: COLOR_DARK;

				drawPerspRectSection(
					g,
					mainLeftX,
					y,
					mainColW,
					cellH,
					mainCX,
					mainCY,
					MAIN_TILT_SIN,
					MAIN_TILT_COS,
					pd,
					mainColor,
				);
				drawPerspRectSection(
					g,
					mainRightX,
					y,
					mainColW,
					cellH,
					mainCX,
					mainCY,
					MAIN_TILT_SIN,
					MAIN_TILT_COS,
					pd,
					mainColor,
				);

				// Side bars (inverted: unlit = cyan)
				const sideColor =
					value * MAIN_COL_CELL_COUNT > ci ? COLOR_DARK : COLOR_SIDE_OFF;

				drawPerspRectSection(
					g,
					sideLeftX,
					y,
					sideW,
					cellH,
					mainCX,
					mainCY,
					MAIN_TILT_SIN,
					MAIN_TILT_COS,
					pd,
					sideColor,
				);
				drawPerspRectSection(
					g,
					sideRightX,
					y,
					sideW,
					cellH,
					mainCX,
					mainCY,
					MAIN_TILT_SIN,
					MAIN_TILT_COS,
					pd,
					sideColor,
				);
			}
		}

		// ─── Sub bars section ─────────────────────────────────────
		const subCX = layout.subOffsetX + layout.subW / 2;
		const subCY = layout.subOffsetY + layout.subH / 2;
		const subTotalW = SUB_BARS_DESIGN_W * layout.s;

		for (let fi = 0; fi < SUB_FREQ_COUNT; fi++) {
			const freqLevel = bars?.[SUB_BAND_INDICES[fi]];
			const value = freqLevel?.value?.[0] ?? 0;

			const bandBaseX = layout.subOffsetX + SUB_BAND_STRIDE * fi * layout.s;
			const subLeftX = bandBaseX;
			const subRightX = bandBaseX + (SUB_COL_WIDTH + SUB_COL_GAP) * layout.s;
			const colW = SUB_COL_WIDTH * layout.s;
			const cellH = layout.subCellH;

			for (let ci = 0; ci < SUB_COL_CELL_COUNT; ci++) {
				const y =
					layout.subOffsetY +
					layout.subH -
					(ci + 1) * cellH -
					ci * SUB_COL_CELL_GAP * layout.s;

				const color = value * SUB_COL_CELL_COUNT > ci ? COLOR_LIT : COLOR_DARK;

				drawPerspRectSection(
					g,
					subLeftX,
					y,
					colW,
					cellH,
					subCX,
					subCY,
					SUB_TILT_SIN,
					SUB_TILT_COS,
					pd,
					color,
				);
				drawPerspRectSection(
					g,
					subRightX,
					y,
					colW,
					cellH,
					subCX,
					subCY,
					SUB_TILT_SIN,
					SUB_TILT_COS,
					pd,
					color,
				);
			}
		}

		// ─── Wing bars ────────────────────────────────────────────
		for (let ci = 0; ci < SUB_COL_CELL_COUNT; ci++) {
			const t = ci / (SUB_COL_CELL_COUNT - 1);
			const wingW =
				(WING_MIN_LOCAL_WIDTH * (1 - t) + WING_MAX_LOCAL_WIDTH * t) * layout.s;
			const cellH = layout.subCellH;
			const y =
				layout.subOffsetY +
				layout.subH -
				(ci + 1) * cellH -
				ci * SUB_COL_CELL_GAP * layout.s;

			// Left wing
			const leftWingX = layout.subOffsetX - WING_GAP * layout.s - wingW;
			drawPerspRectSection(
				g,
				leftWingX,
				y,
				wingW,
				cellH,
				subCX,
				subCY,
				SUB_TILT_SIN,
				SUB_TILT_COS,
				pd,
				COLOR_WING,
			);

			// Right wing
			const rightWingX = layout.subOffsetX + subTotalW + WING_GAP * layout.s;
			drawPerspRectSection(
				g,
				rightWingX,
				y,
				wingW,
				cellH,
				subCX,
				subCY,
				SUB_TILT_SIN,
				SUB_TILT_COS,
				pd,
				COLOR_WING,
			);
		}

		// ─── DotMatrix（傾斜なし・縮小描画）──────────────────────
		const text = displayRef.current;
		const dotPadding = layout.dotAreaH * 0.1;
		const dotAvailH = (layout.dotAreaH - dotPadding * 2) * DOT_SCALE;
		const dotGapRatio = 0.3;
		const dotSize = dotAvailH / (DOT_ROWS + (DOT_ROWS - 1) * dotGapRatio);
		const dotGap = dotSize * dotGapRatio;
		const charW = DOT_COLS * dotSize + (DOT_COLS - 1) * dotGap;
		const charGap = dotSize * 1.5;
		const totalDotW = DOT_CHAR_COUNT * charW + (DOT_CHAR_COUNT - 1) * charGap;
		const dotOffX = (w - totalDotW) / 2;
		const dotOffY = layout.dotOffsetY + (layout.dotAreaH - dotAvailH) / 2;

		for (let ci = 0; ci < DOT_CHAR_COUNT; ci++) {
			const ch = text[ci] ?? " ";
			const bitmap = FONT_5X7[ch] ?? FONT_5X7[" "];
			const charX = dotOffX + ci * (charW + charGap);

			for (let row = 0; row < DOT_ROWS; row++) {
				const rowBits = bitmap![row]!;
				for (let col = 0; col < DOT_COLS; col++) {
					const isOn = (rowBits >> (DOT_COLS - 1 - col)) & 1;
					const dx = charX + col * (dotSize + dotGap);
					const dy = dotOffY + row * (dotSize + dotGap);
					g.rect(dx, dy, dotSize, dotSize);
					g.fill(isOn ? COLOR_DOT_ACTIVE : COLOR_DOT_INACTIVE);
				}
			}
		}
	});

	return (
		<pixiContainer>
			<pixiGraphics
				ref={gRef}
				draw={() => {
					/* imperative drawing in useTick */
				}}
			/>
		</pixiContainer>
	);
}
