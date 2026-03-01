import { Line, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { AnalyzerBarData } from "audiomotion-analyzer";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { isPlayingAtom } from "@/atoms/player";
import { spectrogramAtom, store } from "./spectrogramStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const CELL_WIDTH = 6;
const CELL_HEIGHT = 1;
const ROW_CELL_COUNT = 18; // columns (= 9 bands × 2)
const COL_CELL_COUNT = 32; // rows (height)
const ROW_CELL_GAP = 2;
const COL_CELL_GAP = 0.6;
const ANALYZER_ANGLE_DEGREE = 24;

/** ANSI 1/3-octave indices (mode 6, minFreq 20) for 9 octave bands */
const BAND_INDICES = [4, 7, 10, 13, 16, 19, 22, 25, 28] as const;
const BAND_COUNT = BAND_INDICES.length; // 9

const FREQ_ARRAY = ["60", "120", "250", "500", "1k", "2k", "4k", "8k", "16k"];

const STRIDE_W = CELL_WIDTH + ROW_CELL_GAP; // 8
const STRIDE_H = CELL_HEIGHT + COL_CELL_GAP; // 1.6
const GRID_W = STRIDE_W * ROW_CELL_COUNT; // 144
const GRID_H = STRIDE_H * COL_CELL_COUNT; // 51.2

// ─── GLSL shaders ─────────────────────────────────────────────────────────────
// Each cell is computed entirely on the GPU from vUv and the uniform arrays.
// No InstancedMesh, no per-instance state — 1 draw call per visualizer.
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = `
  precision highp float;

  uniform float uValues[9];
  uniform float uPeaks[9];

  varying vec2 vUv;

  void main() {
    float x = vUv.x * 144.00;
    float y = vUv.y * 51.20;

    // Column slot: gap is the left portion of each stride
    float ci      = floor(x / 8.00);
    float xInSlot = x - ci * 8.00;
    if (xInSlot < 2.00 || ci >= 18.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Row slot: gap is the bottom portion of each stride
    float ri      = floor(y / 1.60);
    float yInSlot = y - ri * 1.60;
    if (yInSlot < 0.60 || ri >= 32.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Columns come in pairs: band 0 = cols 0,1; band 1 = cols 2,3 ...
    int   bandIdx = int(ci) / 2;
    float value   = uValues[bandIdx];
    float peak    = uPeaks[bandIdx];

    // Normalised row position [0,1): 0 = bottom, ~1 = top
    float t       = ri / 32.0;
    bool  isLit   = value > t;
    float peakRow = floor(peak * 32.0);
    bool  isPeak  = (ri == peakRow) || (ri == peakRow - 2.0);

    vec3 color;
    if (isPeak) {
      color = vec3(0.235, 0.510, 0.961); // #3b82f6 blue
    } else if (isLit) {
      color = vec3(0.647, 0.953, 0.988); // #a5f3fc cyan
    } else {
      color = vec3(0.231, 0.004, 0.392); // #3b0764 dark purple
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Root component ───────────────────────────────────────────────────────────
export function VisualizerStandard() {
	const matRef = useRef<THREE.ShaderMaterial>(null);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const { invalidate } = useThree();

	// Render one initial frame so the dark grid appears even before playback.
	// frameloop="demand" fires NO frames automatically — this kicks the first one.
	useEffect(() => {
		invalidate();
	}, [invalidate]);

	useEffect(() => {
		if (isPlaying) invalidate();
	}, [isPlaying, invalidate]);

	// Pre-allocate uniform buffers; never re-created across renders
	const uniforms = useMemo(
		() => ({
			uValues: { value: new Float32Array(BAND_COUNT) },
			uPeaks: { value: new Float32Array(BAND_COUNT) },
		}),
		[],
	);

	useFrame(({ invalidate: inv }) => {
		const bars = audioMotionAnalyzer.getBars() as AnalyzerBarData[];
		store.set(spectrogramAtom, bars);

		const mat = matRef.current;
		if (!mat) {
			if (isPlaying) inv();
			return;
		}

		const vals = mat.uniforms.uValues.value as Float32Array;
		const peaks = mat.uniforms.uPeaks.value as Float32Array;
		for (let i = 0; i < BAND_COUNT; i++) {
			const bar = bars[BAND_INDICES[i]];
			vals[i] = bar?.value?.[0] ?? 0;
			peaks[i] = bar?.peak?.[0] ?? 0;
		}
		mat.uniformsNeedUpdate = true;

		if (isPlaying) inv();
	});

	return (
		<group
			position={[
				-(
					((CELL_WIDTH + ROW_CELL_GAP) * ROW_CELL_COUNT - ROW_CELL_GAP + 80) /
					2
				),
				-(((CELL_HEIGHT + COL_CELL_GAP) * COL_CELL_COUNT - COL_CELL_GAP) / 2),
				0,
			]}
			scale={1.6}
			rotation-x={(Math.PI / 180) * -ANALYZER_ANGLE_DEGREE}
		>
			{/* Single plane – shader draws all 576 cells in 1 draw call */}
			<mesh position={[GRID_W / 2, GRID_H / 2, 0]}>
				<planeGeometry args={[GRID_W, GRID_H]} />
				<shaderMaterial
					ref={matRef}
					vertexShader={VERT}
					fragmentShader={FRAG}
					uniforms={uniforms}
				/>
			</mesh>

			{/* Frequency labels */}
			{Array.from({ length: ROW_CELL_COUNT }).map((_, rowIndex) => (
				<group
					key={`freq-${rowIndex}`}
					rotation-x={(Math.PI / 180) * ANALYZER_ANGLE_DEGREE}
				>
					<Line
						points={[
							[
								(CELL_WIDTH + ROW_CELL_GAP) * rowIndex -
									ROW_CELL_GAP / 2 +
									(rowIndex % 2 === 0 ? 0.3 : 2),
								-2,
								0,
							],
							[
								(CELL_WIDTH + ROW_CELL_GAP) * rowIndex -
									ROW_CELL_GAP / 2 +
									CELL_WIDTH -
									(rowIndex % 2 === 0 ? 2 : 0.3),
								-2,
								0,
							],
						]}
						lineWidth={4}
						color="#67e8f9"
					/>
					<Text
						color="#10b981"
						fontSize={2.4}
						font="https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.woff"
						position={[
							(CELL_WIDTH + ROW_CELL_GAP) * rowIndex - ROW_CELL_GAP,
							-2,
							0,
						]}
					>
						{FREQ_ARRAY[(rowIndex - 1) / 2] ?? ""}
					</Text>
				</group>
			))}
		</group>
	);
}
