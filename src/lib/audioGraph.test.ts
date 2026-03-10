/**
 * audioGraph.ts のユニットテスト。
 * AudioMotionAnalyzer / Web Audio API をモックし、
 * setOutputVolume / setAmFilterActive / connectAudioSource の動作を検証する。
 */
import { afterEach, describe, expect, test, vi } from "vitest";

// ─── Web Audio API のモックトラッカー ──────────────────────────────────────────

interface MockGainNode {
	gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
	channelCount: number;
	channelCountMode: string;
	channelInterpretation: string;
	connect: ReturnType<typeof vi.fn>;
}

interface MockBiquadNode {
	type: string;
	frequency: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
	Q: { value: number };
	gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
	connect: ReturnType<typeof vi.fn>;
}

const gainNodes: MockGainNode[] = [];
const biquadNodes: MockBiquadNode[] = [];
let waveShaperNode: {
	curve: Float32Array | null;
	oversample: string;
	connect: ReturnType<typeof vi.fn>;
};
let compressorNode: {
	threshold: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
	knee: { value: number };
	ratio: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
	attack: { value: number };
	release: { value: number };
	connect: ReturnType<typeof vi.fn>;
};

const SAMPLE_RATE = 44100;

const mockAudioCtx = {
	currentTime: 0,
	sampleRate: SAMPLE_RATE,
	state: "running",
	destination: {},
	createGain: vi.fn(() => {
		const node: MockGainNode = {
			gain: { value: 1, setTargetAtTime: vi.fn() },
			channelCount: 2,
			channelCountMode: "max",
			channelInterpretation: "speakers",
			connect: vi.fn(),
		};
		gainNodes.push(node);
		return node;
	}),
	createBiquadFilter: vi.fn(() => {
		const node: MockBiquadNode = {
			type: "",
			frequency: { value: 0, setTargetAtTime: vi.fn() },
			Q: { value: 0 },
			gain: { value: 0, setTargetAtTime: vi.fn() },
			connect: vi.fn(),
		};
		biquadNodes.push(node);
		return node;
	}),
	createDynamicsCompressor: vi.fn(() => {
		compressorNode = {
			threshold: { value: 0, setTargetAtTime: vi.fn() },
			knee: { value: 0 },
			ratio: { value: 1, setTargetAtTime: vi.fn() },
			attack: { value: 0 },
			release: { value: 0 },
			connect: vi.fn(),
		};
		return compressorNode;
	}),
	createWaveShaper: vi.fn(() => {
		waveShaperNode = {
			curve: null,
			oversample: "2x",
			connect: vi.fn(),
		};
		return waveShaperNode;
	}),
	createBuffer: vi.fn(() => ({
		getChannelData: () => new Float32Array(SAMPLE_RATE * 2),
	})),
	createBufferSource: vi.fn(() => ({
		buffer: null,
		loop: false,
		start: vi.fn(),
		connect: vi.fn(),
	})),
	createMediaElementSource: vi.fn(() => ({
		connect: vi.fn(),
	})),
	addEventListener: vi.fn(),
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.stubGlobal(
	"Audio",
	class {
		pause = vi.fn();
		play = vi.fn();
	},
);

vi.mock("audiomotion-analyzer", () => ({
	default: class MockAudioMotionAnalyzer {
		audioCtx = mockAudioCtx;
		isOn = false;
		connectOutput = vi.fn();
		connectInput = vi.fn();
		start = vi.fn();
		stop = vi.fn();
	},
}));

vi.mock("@/lib/safari-viz-bridge", () => ({
	isMECSNBroken: () => false,
	SafariVizBridge: vi.fn(),
}));

const { setOutputVolume, setAmFilterActive, connectAudioSource } = await import(
	"./audioGraph"
);

// ─── Node layout (module-level creation order) ────────────────────────────────
//
// GainNodes:
//   [0] volumeGainNode  [1] makeupGainNode  [2] monoNode  [3] noiseGain
//
// BiquadFilterNodes:
//   [0..3] HPF ×4   [4..7] LPF ×4   [8] speakerResonance

const volumeGain = () => gainNodes[0];
const makeupGain = () => gainNodes[1];
const monoNode = () => gainNodes[2];
const noiseGain = () => gainNodes[3];
const hpfNodes = () => biquadNodes.slice(0, 4);
const lpfNodes = () => biquadNodes.slice(4, 8);
const speakerNode = () => biquadNodes[8];

afterEach(() => {
	vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("setOutputVolume", () => {
	test("volume=100, mute=false → gain=1.0", () => {
		setOutputVolume(100, false);
		expect(volumeGain().gain.value).toBe(1);
	});

	test("volume=50, mute=false → gain=0.5", () => {
		setOutputVolume(50, false);
		expect(volumeGain().gain.value).toBe(0.5);
	});

	test("volume=0, mute=false → gain=0", () => {
		setOutputVolume(0, false);
		expect(volumeGain().gain.value).toBe(0);
	});

	test("mute=true → gain=0 (volume 無視)", () => {
		setOutputVolume(80, true);
		expect(volumeGain().gain.value).toBe(0);
	});
});

describe("setAmFilterActive", () => {
	test("false → バイパス値に設定", () => {
		setAmFilterActive(false);

		// HPF: 1Hz (全帯域通過)
		for (const hpf of hpfNodes()) {
			expect(hpf.frequency.setTargetAtTime).toHaveBeenCalledWith(
				1,
				expect.any(Number),
				expect.any(Number),
			);
		}

		// LPF: sampleRate/2 (Nyquist)
		for (const lpf of lpfNodes()) {
			expect(lpf.frequency.setTargetAtTime).toHaveBeenCalledWith(
				SAMPLE_RATE / 2,
				expect.any(Number),
				expect.any(Number),
			);
		}

		// WaveShaper: null (リニア)
		expect(waveShaperNode.curve).toBeNull();

		// Compressor: 0dB / 1:1
		expect(compressorNode.threshold.setTargetAtTime).toHaveBeenCalledWith(
			0,
			expect.any(Number),
			expect.any(Number),
		);
		expect(compressorNode.ratio.setTargetAtTime).toHaveBeenCalledWith(
			1,
			expect.any(Number),
			expect.any(Number),
		);

		// makeupGain: 1.0 (0dB)
		expect(makeupGain().gain.setTargetAtTime).toHaveBeenCalledWith(
			1,
			expect.any(Number),
			expect.any(Number),
		);

		// モノ化解除: channelCount=2, max
		expect(monoNode().channelCount).toBe(2);
		expect(monoNode().channelCountMode).toBe("max");

		// スピーカー共振: gain=0 (バイパス)
		expect(speakerNode().gain.setTargetAtTime).toHaveBeenCalledWith(
			0,
			expect.any(Number),
			expect.any(Number),
		);
	});

	test("true → AM フィルタパラメーターが設定される", () => {
		const settings = {
			lpfFreq: 4000,
			hpfFreq: 100,
			distortionAmount: 2.0,
			compThreshold: -30,
			compRatio: 8,
			noiseLevel: 0.01,
			speakerResonanceFreq: 1500,
			speakerResonanceGain: 6,
		};

		setAmFilterActive(true, settings);

		// HPF: 指定カットオフ
		for (const hpf of hpfNodes()) {
			expect(hpf.frequency.setTargetAtTime).toHaveBeenCalledWith(
				100,
				expect.any(Number),
				expect.any(Number),
			);
		}

		// LPF: 指定カットオフ
		for (const lpf of lpfNodes()) {
			expect(lpf.frequency.setTargetAtTime).toHaveBeenCalledWith(
				4000,
				expect.any(Number),
				expect.any(Number),
			);
		}

		// WaveShaper: non-null curve
		expect(waveShaperNode.curve).not.toBeNull();
		expect(waveShaperNode.curve).toBeInstanceOf(Float32Array);

		// Compressor: 指定値
		expect(compressorNode.threshold.setTargetAtTime).toHaveBeenCalledWith(
			-30,
			expect.any(Number),
			expect.any(Number),
		);
		expect(compressorNode.ratio.setTargetAtTime).toHaveBeenCalledWith(
			8,
			expect.any(Number),
			expect.any(Number),
		);

		// モノラル化
		expect(monoNode().channelCount).toBe(1);
		expect(monoNode().channelCountMode).toBe("explicit");

		// スピーカー共振
		expect(speakerNode().frequency.setTargetAtTime).toHaveBeenCalledWith(
			1500,
			expect.any(Number),
			expect.any(Number),
		);
		expect(speakerNode().gain.setTargetAtTime).toHaveBeenCalledWith(
			6,
			expect.any(Number),
			expect.any(Number),
		);

		// ノイズソースが遅延生成される
		expect(mockAudioCtx.createBuffer).toHaveBeenCalledTimes(1);
		expect(mockAudioCtx.createBufferSource).toHaveBeenCalledTimes(1);
	});

	test("distortionAmount=0 → curve は null (バイパス)", () => {
		setAmFilterActive(true, {
			lpfFreq: 4000,
			hpfFreq: 100,
			distortionAmount: 0,
			compThreshold: -30,
			compRatio: 8,
			noiseLevel: 0,
			speakerResonanceFreq: 1200,
			speakerResonanceGain: 0,
		});

		expect(waveShaperNode.curve).toBeNull();
	});
});

describe("connectAudioSource", () => {
	test("初回呼び出しで createMediaElementSource が呼ばれる", () => {
		connectAudioSource();
		expect(mockAudioCtx.createMediaElementSource).toHaveBeenCalledTimes(1);
	});

	test("2 回目の呼び出しは no-op", () => {
		connectAudioSource();
		// _audioSourceConnected フラグにより 2 回目は何もしない
		expect(mockAudioCtx.createMediaElementSource).not.toHaveBeenCalled();
	});
});

describe("ノイズバッファ遅延生成", () => {
	test("noiseGain は初期値 0 で作成済み", () => {
		expect(noiseGain().gain.value).toBe(0);
	});

	test("追加の AM 有効化ではノイズソースは再生成されない", () => {
		mockAudioCtx.createBuffer.mockClear();
		mockAudioCtx.createBufferSource.mockClear();
		setAmFilterActive(true, {
			lpfFreq: 4000,
			hpfFreq: 100,
			distortionAmount: 0,
			compThreshold: -30,
			compRatio: 8,
			noiseLevel: 0.02,
			speakerResonanceFreq: 1200,
			speakerResonanceGain: 0,
		});
		expect(mockAudioCtx.createBuffer).not.toHaveBeenCalled();
		expect(mockAudioCtx.createBufferSource).not.toHaveBeenCalled();
	});
});
