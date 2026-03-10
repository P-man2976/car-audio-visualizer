/**
 * useMediaSession フックのユニットテスト。
 * navigator.mediaSession をモックし、ソース種別ごとの
 * アクションハンドラー登録を検証する。
 */
import { afterEach, describe, expect, test, vi } from "vitest";

// ─── Mock navigator.mediaSession ─────────────────────────────────────────────

const handlers = new Map<string, ((...args: unknown[]) => void) | null>();
const mockSetActionHandler = vi.fn(
	(action: string, handler: ((...args: unknown[]) => void) | null) => {
		handlers.set(action, handler);
	},
);
const mockSetPositionState = vi.fn();

vi.stubGlobal("navigator", {
	mediaSession: {
		setActionHandler: mockSetActionHandler,
		setPositionState: mockSetPositionState,
		metadata: null,
		playbackState: "none",
	},
});
vi.stubGlobal(
	"MediaMetadata",
	class {
		title?: string;
		artist?: string;
		album?: string;
		artwork?: { src: string }[];
		constructor(init: {
			title?: string;
			artist?: string;
			album?: string;
			artwork?: { src: string }[];
		}) {
			Object.assign(this, init);
		}
	},
);

// ─── Mock Player / Radio hooks ───────────────────────────────────────────────

const mockPlay = vi.fn(() => Promise.resolve());
const mockPause = vi.fn();
const mockNext = vi.fn();
const mockPrev = vi.fn();
const mockPlayRadio = vi.fn();
const mockStopRadio = vi.fn();
const mockTune = vi.fn();

vi.mock("./player", () => ({
	usePlayer: () => ({
		play: mockPlay,
		pause: mockPause,
		next: mockNext,
		prev: mockPrev,
		isPlaying: false,
	}),
}));

vi.mock("./radio", () => ({
	useRadioPlayer: () => ({
		playRadio: mockPlayRadio,
		stopRadio: mockStopRadio,
		tune: mockTune,
		isRadikoLoading: false,
	}),
}));

// ─── Mock Jotai / React ──────────────────────────────────────────────────────

let currentSrcValue = "off";
const mockAudioElement = {
	duration: 180,
	currentTime: 30,
};

vi.mock("jotai", () => ({
	useAtomValue: (atom: { _tag?: string }) => {
		switch (atom._tag) {
			case "audioElement":
				return mockAudioElement;
			case "isPlaying":
				return false;
			case "progress":
				return 30;
			case "currentSrc":
				return currentSrcValue;
			default:
				return undefined;
		}
	},
}));

vi.mock("@/atoms/audio", () => ({
	audioElementAtom: { _tag: "audioElement" },
}));

vi.mock("@/atoms/player", () => ({
	currentSrcAtom: { _tag: "currentSrc" },
	isPlayingAtom: { _tag: "isPlaying" },
	progressAtom: { _tag: "progress" },
}));

// useEffect を即時実行し、クリーンアップ関数を収集する
const cleanups: (() => void)[] = [];
vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useEffect: (fn: () => void | (() => void)) => {
			const cleanup = fn();
			if (typeof cleanup === "function") cleanups.push(cleanup);
		},
	};
});

const { useMediaSession } = await import("./mediaSession");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCallMediaSession() {
	cleanups.length = 0;
	handlers.clear();
	useMediaSession({
		title: "Test Title",
		artist: "Test Artist",
		album: "Test Album",
	});
}

afterEach(() => {
	for (const fn of cleanups) fn();
	cleanups.length = 0;
	handlers.clear();
	vi.clearAllMocks();
	currentSrcValue = "off";
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useMediaSession", () => {
	describe("ファイルモード", () => {
		test("nexttrack で next() が呼ばれる", () => {
			currentSrcValue = "file";
			useCallMediaSession();
			const handler = handlers.get("nexttrack");
			expect(handler).toBeTypeOf("function");
			handler!();
			expect(mockNext).toHaveBeenCalledOnce();
		});

		test("previoustrack で prev() が呼ばれる", () => {
			currentSrcValue = "file";
			useCallMediaSession();
			const handler = handlers.get("previoustrack");
			expect(handler).toBeTypeOf("function");
			handler!();
			expect(mockPrev).toHaveBeenCalledOnce();
		});
	});

	describe("ラジオモード", () => {
		test("nexttrack で tune(1) が呼ばれる", () => {
			currentSrcValue = "radio";
			useCallMediaSession();
			const handler = handlers.get("nexttrack");
			expect(handler).toBeTypeOf("function");
			handler!();
			expect(mockTune).toHaveBeenCalledWith(1);
		});

		test("previoustrack で tune(-1) が呼ばれる", () => {
			currentSrcValue = "radio";
			useCallMediaSession();
			const handler = handlers.get("previoustrack");
			expect(handler).toBeTypeOf("function");
			handler!();
			expect(mockTune).toHaveBeenCalledWith(-1);
		});

		test("play で playRadio() が呼ばれる", () => {
			currentSrcValue = "radio";
			useCallMediaSession();
			const handler = handlers.get("play");
			expect(handler).toBeTypeOf("function");
			handler!();
			expect(mockPlayRadio).toHaveBeenCalledOnce();
		});

		test("pause で stopRadio() が呼ばれる", () => {
			currentSrcValue = "radio";
			useCallMediaSession();
			const handler = handlers.get("pause");
			expect(handler).toBeTypeOf("function");
			handler!();
			expect(mockStopRadio).toHaveBeenCalledOnce();
		});
	});

	describe("off モード", () => {
		test("全アクションハンドラーが null", () => {
			currentSrcValue = "off";
			useCallMediaSession();
			// off モードでは最後に設定された値が null
			expect(handlers.get("play")).toBeNull();
			expect(handlers.get("pause")).toBeNull();
			expect(handlers.get("nexttrack")).toBeNull();
			expect(handlers.get("previoustrack")).toBeNull();
		});
	});
});
