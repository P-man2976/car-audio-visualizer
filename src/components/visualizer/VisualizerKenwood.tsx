import { Line, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const FREQ_COUNT = 11;
const CELL_HEIGHT = 0.6;
const COL_CELL_COUNT = 26;
const COL_CELL_GAP = 0.8;
const ANALYZER_ANGLE_DEGREE = 20;

const SUB_COL_WIDTH = 3.6;
const SUB_COL_GAP = 0.5;
const MAIN_BAR_WIDTH = SUB_COL_WIDTH * 2 + SUB_COL_GAP; // 7.7

const SIDE_BAR_WIDTH = 0.6;
const SIDE_GAP = 0.5;
const SIDE_UNIT = SIDE_BAR_WIDTH + SIDE_GAP; // 1.1

const BAND_GAP = 2.0;
const BAND_STRIDE = SIDE_UNIT + MAIN_BAR_WIDTH + SIDE_UNIT + BAND_GAP; // 11.9
const TOTAL_WIDTH = BAND_STRIDE * FREQ_COUNT - BAND_GAP; // 128.9

/**
 * ANSI 1/3-octave indices (mode 6, minFreq 20) for DPX-5021M 11 bands:
 * 63, 125, 250, 500, 1k, 2k, 4k, 6.3k, 8k, 12.5k, 16k Hz
 */
const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 24, 25, 27, 28] as const;

const FREQ_ARRAY = [
	"62.5",
	"125",
	"250",
	"500",
	"1k",
	"2k",
	"4k",
	"6.3k",
	"8k",
	"12.5k",
	"16k",
];

const STRIDE_H = CELL_HEIGHT + COL_CELL_GAP; // 1.4
const GRID_H = STRIDE_H * COL_CELL_COUNT; // 36.4

// bandCenterCX for labels only (not used in shader)
const bandCenterCX = (fi: number) =>
	BAND_STRIDE * fi + SIDE_UNIT + MAIN_BAR_WIDTH / 2;

// ─── GLSL shaders ─────────────────────────────────────────────────────────────
// Within each BAND_STRIDE the x-layout is:
//   [0,   0.6) = left side bar  (inverted EQ)
//   [0.6, 1.1) = gap
//   [1.1, 4.7) = left main sub-col  (normal EQ)
//   [4.7, 5.2) = gap
//   [5.2, 8.8) = right main sub-col (normal EQ)
//   [8.8, 9.3) = gap
//   [9.3, 9.9) = right side bar (inverted EQ)
//   [9.9,11.9) = band gap (transparent between bands)
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uValues[11];
  uniform float uPeaks[11];

  varying vec2 vUv;

  void main() {
    float x = vUv.x * 128.90;
    float y = vUv.y * 36.40;

    // ── Which band? ──────────────────────────────────────────────────────────
    float fi       = floor(x / 11.90);
    float xInBand  = x - fi * 11.90;
    if (fi >= 11.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Classify x position within the band
    bool isLeftSide  = xInBand < 0.60;
    bool isRightSide = xInBand >= 9.30 && xInBand < 9.90;
    bool isGap       = (!isLeftSide&&!isRightSide)&&
                       ((xInBand >= 0.60 && xInBand < 1.10) ||
                        (xInBand >= 4.70 && xInBand < 5.20) ||
                        (xInBand >= 8.80 && xInBand < 9.30) ||
                        (xInBand >= 9.90));

    if (isGap) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // ── Which row? ───────────────────────────────────────────────────────────
    float ri      = floor(y / 1.40);
    float yInSlot = y - ri * 1.40;
    if (yInSlot < 0.80 || ri >= 26.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // ── Audio lookup ─────────────────────────────────────────────────────────
    int   bandIdx = int(fi);
    float value   = uValues[bandIdx];
    float peak    = uPeaks[bandIdx];

    float t       = ri / 26.0;
    bool  isLit   = value > t;
    float peakRow = floor(peak * 26.0);
    bool  isPeak  = (ri == peakRow) || (ri == peakRow - 2.0);

    vec3 color;
    if (isLeftSide || isRightSide) {
      // Side bars: inverted – teal when un-lit, near-black when lit
      color = isLit ? vec3(0.020, 0.000, 0.071)   // #050012
                    : vec3(0.055, 0.447, 0.565);   // #0e7490
    } else {
      // Main bars: normal EQ – cyan/white peak/near-black
      if (isPeak) {
        color = vec3(1.0, 1.0, 1.0);              // #ffffff white peak
      } else if (isLit) {
        color = vec3(0.647, 0.953, 0.988);        // #a5f3fc cyan
      } else {
        color = vec3(0.031, 0.000, 0.094);        // #080018 near-black
      }
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerKenwood() {
	const matRef = useRef<THREE.ShaderMaterial>(null);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);

	// Pre-allocate uniform buffers; never re-created
	const uniforms = useMemo(
		() => ({
			uValues: { value: new Float32Array(FREQ_COUNT) },
			uPeaks: { value: new Float32Array(FREQ_COUNT) },
		}),
		[],
	);

	useFrame(() => {
		const bars = audioMotionAnalyzer.getBars() as AnalyzerBarData[];
		store.set(spectrogramAtom, bars);

		const mat = matRef.current;
		if (!mat) return;

		const vals = mat.uniforms.uValues.value as Float32Array;
		const peaks = mat.uniforms.uPeaks.value as Float32Array;
		for (let i = 0; i < FREQ_COUNT; i++) {
			const bar = bars[BAND_INDICES[i]];
			vals[i] = bar?.value?.[0] ?? 0;
			peaks[i] = bar?.peak?.[0] ?? 0;
		}
		mat.uniformsNeedUpdate = true;
	});

	const totalHeight =
		(CELL_HEIGHT + COL_CELL_GAP) * COL_CELL_COUNT - COL_CELL_GAP;
	const SCALE = 1.6;

	return (
		<group
			position={[-TOTAL_WIDTH * (SCALE / 2), -totalHeight * (SCALE / 2), 0]}
			scale={SCALE}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{/* Single plane — shader draws all bars in 1 draw call */}
			<mesh position={[TOTAL_WIDTH / 2, GRID_H / 2, 0]}>
				<planeGeometry args={[TOTAL_WIDTH, GRID_H]} />
				<shaderMaterial
					ref={matRef}
					vertexShader={VERT}
					fragmentShader={FRAG}
					uniforms={uniforms}
				/>
			</mesh>

			{/* Frequency labels (11 groups) */}
			{Array.from({ length: FREQ_COUNT }).map((_, fi) => (
				<group
					key={`k-label-${fi}`}
					rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}
				>
					<Line
						points={[
							[bandCenterCX(fi) - MAIN_BAR_WIDTH / 2, -2, 0],
							[bandCenterCX(fi) + MAIN_BAR_WIDTH / 2, -2, 0],
						]}
						lineWidth={4}
						color="#67e8f9"
					/>
					<Text
						color="#10b981"
						fontSize={2.4}
						font="https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.woff"
						position={[bandCenterCX(fi), -6, 0]}
					>
						{FREQ_ARRAY[fi] ?? ""}
					</Text>
				</group>
			))}
		</group>
	);
}
