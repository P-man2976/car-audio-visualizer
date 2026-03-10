/**
 * Canvas 2D ビジュアライザー（PixiJS / @pixi/react）
 *
 * React Three Fiber を介さず、@pixi/react (PixiJS v8) で
 * スペクトログラムバー + 周波数ラベル + DotMatrix テキストを 2D 描画する。
 * useTick で毎フレーム audioMotionAnalyzer.getBars() を読み取り、
 * Graphics ref に対して poly / fill で台形セルを描画する。
 *
 * CSS transform は使わず、各セルをパースペクティブ射影で台形に変形して
 * 3D 風傾斜を描画段階で表現する。
 */
import { Application, extend, useApplication, useTick } from "@pixi/react";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { useEffect, useRef } from "react";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { displayStringAtom } from "@/atoms/display";
import { pinchZoomAtom } from "@/atoms/visualizerZoom";
import { useSteppedBars } from "@/hooks/useSteppedBars";
import { FONT_5X7 } from "@/lib/dotmatrix-font";

// ─── PixiJS extend ──────────────────────────────────────────────────────────
extend({ Container, Graphics, Text });

// ─── Montserrat font loading ────────────────────────────────────────────────
const FREQ_ARRAY = ["60", "120", "250", "500", "1k", "2k", "4k", "8k", "16k"];
const FONT_FAMILY = "Montserrat";
const montserratReady = new FontFace(
	FONT_FAMILY,
	'url("https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.woff2")',
	{ weight: "600" },
)
	.load()
	.then((face) => {
		document.fonts.add(face);
		return face;
	});

// ── ラベル色 ─────────────────────────────────────────────────────────────
const COLOR_LABEL = 0x10b981;

// ═══════════════════════════════════════════════════════════════════════════
// 定数（編集はここだけで完結）
// ═══════════════════════════════════════════════════════════════════════════

// ── バンド構成 ──────────────────────────────────────────────────────────
const FREQ_COUNT = 9;
const COL_CELL_COUNT = 32;
const COLS_PER_BAND = 2;
const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 25, 28] as const;

// ── セル・ギャップ（固定 px） ──────────────────────────────────────────
const CELL_ASPECT = 6;
const CELL_GAP_V = 0.6;
const COL_GAP_H = 2;
const BAND_GAP_H = 2;

// ── レイアウト比率 ──────────────────────────────────────────────────────
const BAR_FRAC = 0.76;
const LABEL_FRAC = 0.06;
const DOT_FRAC = 0.18;
const PADDING_FRAC = 0.08;

// ── パースペクティブ ────────────────────────────────────────────────────
const PERSPECTIVE_DIST = 50;
const TILT_DEG = 24;

// ── DotMatrix ───────────────────────────────────────────────────────────
const DOT_COLS = 5;
const DOT_ROWS = 7;
const DOT_CHAR_COUNT = 12;
const DOT_SCALE = 0.85;

// ── カラー（PixiJS 数値） ──────────────────────────────────────────────
const COLOR_LIT = 0xa5f3fc;
const COLOR_DARK = 0x1e1b2e;
const COLOR_PEAK = 0x3b82f6;
const COLOR_BG = 0x0a0a0a;
const COLOR_UNDERLINE = 0x67e8f9;
const COLOR_DOT_ACTIVE = 0xa5f3fc;
const COLOR_DOT_INACTIVE = 0x1e1b2e;

// ═══════════════════════════════════════════════════════════════════════════
// 派生定数（編集不要）
// ═══════════════════════════════════════════════════════════════════════════
const TILT_SIN = Math.sin((TILT_DEG * Math.PI) / 180);
const TILT_COS = Math.cos((TILT_DEG * Math.PI) / 180);

// ─── Layout calculator ──────────────────────────────────────────────────────
interface BarLayout {
	/** 均一スケール係数 */
	s: number;
	cellW: number;
	cellH: number;
	offsetX: number;
	offsetY: number;
	barAreaH: number;
	labelAreaY: number;
	labelAreaH: number;
	dotAreaY: number;
	dotAreaH: number;
}

// デザイン空間寸法（定数から算出、編集不要）
const DESIGN_CELL_W = CELL_ASPECT;
const DESIGN_CELL_H = 1;
const DESIGN_BAR_H =
	COL_CELL_COUNT * DESIGN_CELL_H + (COL_CELL_COUNT - 1) * CELL_GAP_V;
const DESIGN_LABEL_H = DESIGN_BAR_H * (LABEL_FRAC / BAR_FRAC);
const DESIGN_DOT_H = DESIGN_BAR_H * (DOT_FRAC / BAR_FRAC);
const DESIGN_TOTAL_H = DESIGN_BAR_H + DESIGN_LABEL_H + DESIGN_DOT_H;
const DESIGN_TOTAL_W =
	FREQ_COUNT * COLS_PER_BAND * DESIGN_CELL_W +
	FREQ_COUNT * COL_GAP_H +
	(FREQ_COUNT - 1) * BAND_GAP_H;

function computeLayout(w: number, h: number, zoom = 1): BarLayout {
	const usableW = w * (1 - PADDING_FRAC * 2);
	const usableH = h * (1 - PADDING_FRAC * 2);

	// 均一スケール: デザイン空間→スクリーン（ピンチズーム倍率を乗算）
	const s = Math.min(usableW / DESIGN_TOTAL_W, usableH / DESIGN_TOTAL_H) * zoom;

	const cellW = DESIGN_CELL_W * s;
	const cellH = DESIGN_CELL_H * s;
	const barAreaH = DESIGN_BAR_H * s;
	const labelAreaH = DESIGN_LABEL_H * s;
	const dotAreaH = DESIGN_DOT_H * s;

	const totalW = DESIGN_TOTAL_W * s;
	const totalH = DESIGN_TOTAL_H * s;
	const offsetX = (w - totalW) / 2;
	const offsetY = (h - totalH) / 2;

	return {
		s,
		cellW,
		cellH,
		offsetX,
		offsetY,
		barAreaH,
		labelAreaY: offsetY + dotAreaH + barAreaH,
		labelAreaH,
		dotAreaY: offsetY,
		dotAreaH,
	};
}

/** バンド fi, 列 col の X 座標（ギャップもスケール済み） */
function bandColX(layout: BarLayout, fi: number, col: number): number {
	return (
		layout.offsetX +
		(fi * COLS_PER_BAND + col) * layout.cellW +
		(fi + col) * COL_GAP_H * layout.s +
		fi * BAND_GAP_H * layout.s
	);
}

// ─── Perspective Projection ─────────────────────────────────────────────────

/** フラット座標 (x,y) をパースペクティブ射影でスクリーン座標に変換 */
function project(
	x: number,
	y: number,
	sw: number,
	sh: number,
	perspDist: number,
): [number, number] {
	const cx = sw / 2;
	const cy = sh / 2;
	const dy = y - cy;
	const z = -dy * TILT_SIN;
	const s = perspDist / (perspDist + z);
	return [cx + (x - cx) * s, cy + dy * TILT_COS * s];
}

/** フラット矩形を台形としてパースペクティブ描画 */
function drawPerspRect(
	g: Graphics,
	x: number,
	y: number,
	w: number,
	h: number,
	sw: number,
	sh: number,
	perspDist: number,
	color: number,
): void {
	const [tlx, tly] = project(x, y, sw, sh, perspDist);
	const [trx, _try] = project(x + w, y, sw, sh, perspDist);
	const [brx, bry] = project(x + w, y + h, sw, sh, perspDist);
	const [blx, bly] = project(x, y + h, sw, sh, perspDist);
	g.poly([tlx, tly, trx, _try, brx, bry, blx, bly]);
	g.fill(color);
}

// ─── Root wrapper (exported) ────────────────────────────────────────────────
/**
 * PixiJS Application をホストする React コンポーネント。
 * R3F Canvas の外で使用する。傾斜は描画段階で台形セルとして表現。
 */
export function VisualizerCanvas2D() {
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
				<VisualizerScene />
			</Application>
		</div>
	);
}

// ─── Inner scene ────────────────────────────────────────────────────────────
function VisualizerScene() {
	const audioMotion = useAtomValue(audioMotionAnalyzerAtom);
	const displayString = useAtomValue(displayStringAtom);
	const pinchZoom = useAtomValue(pinchZoomAtom);
	const processBars = useSteppedBars();
	const displayRef = useRef(displayString);
	displayRef.current = displayString;

	const { app } = useApplication();
	const barsRef = useRef<AnalyzerBarData[]>([]);
	const gRef = useRef<Graphics | null>(null);
	const labelContainerRef = useRef<Container | null>(null);
	const labelsRef = useRef<Text[]>([]);
	const fontLoadedRef = useRef(false);

	// Montserrat フォントロード → Text オブジェクト生成
	useEffect(() => {
		let cancelled = false;
		montserratReady.then(() => {
			if (cancelled) return;
			const container = labelContainerRef.current;
			if (!container) return;
			fontLoadedRef.current = true;

			const style = new TextStyle({
				fontFamily: FONT_FAMILY,
				fontWeight: "600",
				fontSize: 14,
				fill: COLOR_LABEL,
			});

			for (let i = 0; i < FREQ_COUNT; i++) {
				const t = new Text({ text: FREQ_ARRAY[i], style });
				t.anchor.set(0.5, 0);
				container.addChild(t);
				labelsRef.current.push(t);
			}
		});
		return () => {
			cancelled = true;
			for (const t of labelsRef.current) t.destroy();
			labelsRef.current = [];
		};
	}, []);

	// 毎 tick でオーディオデータを取得し描画を更新
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

		const layout = computeLayout(w, h, pinchZoom);
		const bars = barsRef.current;
		const pd = PERSPECTIVE_DIST * layout.s;

		// ─── バー描画 ───────────────────────────────────────────
		for (let fi = 0; fi < FREQ_COUNT; fi++) {
			const freqLevel = bars?.[BAND_INDICES[fi]];
			const value = freqLevel?.value?.[0] ?? 0;
			const peak = freqLevel?.peak?.[0] ?? 0;

			for (let col = 0; col < COLS_PER_BAND; col++) {
				const x = bandColX(layout, fi, col);
				for (let ci = 0; ci < COL_CELL_COUNT; ci++) {
					const y =
						layout.offsetY +
						layout.dotAreaH +
						layout.barAreaH -
						(ci + 1) * layout.cellH -
						ci * CELL_GAP_V * layout.s;

					const isPeak =
						(ci < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci + 1) ||
						(ci - 2 < peak * COL_CELL_COUNT && peak * COL_CELL_COUNT < ci - 1);

					const color = isPeak
						? COLOR_PEAK
						: value * COL_CELL_COUNT > ci
							? COLOR_LIT
							: COLOR_DARK;

					drawPerspRect(g, x, y, layout.cellW, layout.cellH, w, h, pd, color);
				}
			}
		}

		// ─── アンダーライン ──────────────────────────────────────
		const lineY = layout.labelAreaY + layout.labelAreaH * 0.15;
		const lineH = Math.max(1, layout.labelAreaH * 0.08);

		for (let fi = 0; fi < FREQ_COUNT; fi++) {
			const xLeft = bandColX(layout, fi, 0);
			const xRight = bandColX(layout, fi, 1);

			drawPerspRect(
				g,
				xLeft + layout.cellW * 0.05,
				lineY,
				layout.cellW * 0.7,
				lineH,
				w,
				h,
				pd,
				COLOR_UNDERLINE,
			);
			drawPerspRect(
				g,
				xRight + layout.cellW * 0.3,
				lineY,
				layout.cellW * 0.65,
				lineH,
				w,
				h,
				pd,
				COLOR_UNDERLINE,
			);
		}

		// ─── 周波数ラベル（Montserrat Text） ──────────────────
		if (fontLoadedRef.current) {
			const labelFontSize = Math.max(6, layout.labelAreaH * 0.55);
			const labelY = layout.labelAreaY + layout.labelAreaH * 0.3;

			for (let fi = 0; fi < FREQ_COUNT; fi++) {
				const label = labelsRef.current[fi];
				if (!label) continue;

				// 左列と右列の中央に配置
				const xLeft = bandColX(layout, fi, 0);
				const xRight = bandColX(layout, fi, 1);
				const centerX = (xLeft + xRight + layout.cellW) / 2;

				// パースペクティブ射影でスクリーン座標を取得
				const [px, py] = project(centerX, labelY, w, h, pd);
				label.x = px;
				label.y = py;
				label.style.fontSize = labelFontSize;
			}
		}

		// ─── DotMatrix（傾斜なし・縮小描画） ───────────────────
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
		const dotOffY = layout.dotAreaY + (layout.dotAreaH - dotAvailH) / 2;

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
			<pixiContainer ref={labelContainerRef} />
		</pixiContainer>
	);
}
