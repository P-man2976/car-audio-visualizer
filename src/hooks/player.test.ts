/**
 * usePlayer フックのユニットテスト。
 * Jotai / React / audio 関連のモジュールをモックし、
 * next / prev / skipTo / play / pause / stop の動作を検証する。
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Song } from "@/types/player";

// ─── Mock Audio ───────────────────────────────────────────────────────────────

const mockPlay = vi.fn(() => Promise.resolve());
const mockPause = vi.fn();
const mockResume = vi.fn(() => Promise.resolve());
const mockStart = vi.fn();
const mockAnalyzerStop = vi.fn();

const mockAudioElement = {
	play: mockPlay,
	pause: mockPause,
	currentTime: 0,
};

const mockAnalyzer = {
	audioCtx: { resume: mockResume },
	start: mockStart,
	stop: mockAnalyzerStop,
};

// ─── Mock Atom Store ──────────────────────────────────────────────────────────

const atoms = {
	currentSrc: { init: "off" as string },
	isPlaying: { init: false },
	currentSong: { init: null as Song | null },
	songQueue: { init: [] as Song[] },
	songHistory: { init: [] as Song[] },
	audioElement: { init: mockAudioElement },
	audioMotionAnalyzer: { init: mockAnalyzer },
	shuffle: { init: false },
	repeatMode: { init: "off" as string },
	preShuffleQueue: { init: null as Song[] | null },
};

const state = new Map<unknown, unknown>();

function mockGet<T>(atom: { init?: T }): T {
	return (state.has(atom) ? state.get(atom) : atom?.init) as T;
}

function mockSet<T>(atom: unknown, value: T | ((prev: T) => T)) {
	const prev = mockGet(atom as { init?: T });
	const next =
		typeof value === "function" ? (value as (p: T) => T)(prev) : value;
	state.set(atom, next);
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useCallback: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
	};
});

vi.mock("jotai", () => ({
	useAtom: (atom: { init?: unknown }) => [
		mockGet(atom),
		(v: unknown) => mockSet(atom, v as never),
	],
	useAtomValue: (atom: { init?: unknown }) => mockGet(atom),
	useSetAtom: (atom: { init?: unknown }) => (v: unknown) =>
		mockSet(atom, v as never),
}));

vi.mock("@/atoms/player", () => ({
	currentSrcAtom: atoms.currentSrc,
	isPlayingAtom: atoms.isPlaying,
	currentSongAtom: atoms.currentSong,
	songQueueAtom: atoms.songQueue,
	songHistoryAtom: atoms.songHistory,
	shuffleAtom: atoms.shuffle,
	repeatModeAtom: atoms.repeatMode,
	preShuffleQueueAtom: atoms.preShuffleQueue,
}));

vi.mock("@/atoms/audio", () => ({
	audioElementAtom: atoms.audioElement,
	audioMotionAnalyzerAtom: atoms.audioMotionAnalyzer,
}));

vi.mock("@/lib/shuffle", () => ({
	shuffleArray: <T>(arr: T[]) => [...arr].reverse(),
}));

const { usePlayer } = await import("./player");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeSong = (id: string): Song => ({
	id,
	filename: `${id}.mp3`,
	title: id,
	track: {},
});

afterEach(() => {
	state.clear();
	mockPlay.mockClear();
	mockPause.mockClear();
	mockResume.mockClear();
	mockStart.mockClear();
	mockAnalyzerStop.mockClear();
	mockAudioElement.currentTime = 0;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("usePlayer", () => {
	// ─── next ─────────────────────────────────────────────────────────────
	describe("next()", () => {
		test("キューの先頭を currentSong に移動し、現在の曲を履歴に追加", () => {
			const a = makeSong("a");
			const b = makeSong("b");
			const c = makeSong("c");
			state.set(atoms.currentSong, a);
			state.set(atoms.songQueue, [b, c]);
			state.set(atoms.songHistory, []);

			const { next } = usePlayer();
			next();

			expect(mockGet(atoms.currentSong)).toEqual(b);
			expect(mockGet(atoms.songQueue)).toEqual([c]);
			expect(mockGet(atoms.songHistory)).toEqual([a]);
		});

		test("currentSong が null のとき、履歴に null を追加しない", () => {
			const b = makeSong("b");
			state.set(atoms.currentSong, null);
			state.set(atoms.songQueue, [b]);
			state.set(atoms.songHistory, []);

			const { next } = usePlayer();
			next();

			expect(mockGet(atoms.currentSong)).toEqual(b);
			expect(mockGet(atoms.songHistory)).toEqual([]);
		});

		test("キュー空 + repeat off → currentSong null で stop()", () => {
			const a = makeSong("a");
			state.set(atoms.currentSong, a);
			state.set(atoms.songQueue, []);
			state.set(atoms.songHistory, []);
			state.set(atoms.repeatMode, "off");

			const { next } = usePlayer();
			next();

			expect(mockGet(atoms.currentSong)).toBeNull();
			expect(mockPause).toHaveBeenCalled();
			expect(mockGet(atoms.currentSrc)).toBe("off");
		});

		test("キュー空 + repeat one → repeat off と同様に停止", () => {
			const a = makeSong("a");
			state.set(atoms.currentSong, a);
			state.set(atoms.songQueue, []);
			state.set(atoms.songHistory, []);
			state.set(atoms.repeatMode, "one");

			const { next } = usePlayer();
			next();

			expect(mockGet(atoms.currentSong)).toBeNull();
			expect(mockPause).toHaveBeenCalled();
		});

		test("キュー空 + repeat all + 履歴あり → 履歴をキューに再構成", () => {
			const a = makeSong("a");
			const b = makeSong("b");
			state.set(atoms.currentSong, a);
			state.set(atoms.songQueue, []);
			state.set(atoms.songHistory, [b]);
			state.set(atoms.repeatMode, "all");
			state.set(atoms.shuffle, false);

			const { next } = usePlayer();
			next();

			// newHistory = [b, a], shuffle=false → [b, a], first=b rest=[a]
			expect(mockGet(atoms.currentSong)).toEqual(b);
			expect(mockGet(atoms.songQueue)).toEqual([a]);
			expect(mockGet(atoms.songHistory)).toEqual([]);
			expect(mockGet(atoms.preShuffleQueue)).toBeNull();
		});

		test("キュー空 + repeat all + shuffle → reversed (mock shuffle)", () => {
			const a = makeSong("a");
			const b = makeSong("b");
			const c = makeSong("c");
			state.set(atoms.currentSong, a);
			state.set(atoms.songQueue, []);
			state.set(atoms.songHistory, [b, c]);
			state.set(atoms.repeatMode, "all");
			state.set(atoms.shuffle, true);

			const { next } = usePlayer();
			next();

			// newHistory = [b, c, a], shuffled (reversed) → [a, c, b]
			expect(mockGet(atoms.currentSong)).toEqual(a);
			expect(mockGet(atoms.songQueue)).toEqual([c, b]);
		});

		test("キュー空 + repeat all + 履歴空 → 停止", () => {
			state.set(atoms.currentSong, null);
			state.set(atoms.songQueue, []);
			state.set(atoms.songHistory, []);
			state.set(atoms.repeatMode, "all");

			const { next } = usePlayer();
			next();

			expect(mockGet(atoms.currentSong)).toBeNull();
			expect(mockPause).toHaveBeenCalled();
		});
	});

	// ─── prev ─────────────────────────────────────────────────────────────
	describe("prev()", () => {
		test("履歴の末尾を currentSong に、現在の曲をキュー先頭に戻す", () => {
			const a = makeSong("a");
			const b = makeSong("b");
			const c = makeSong("c");
			state.set(atoms.currentSong, b);
			state.set(atoms.songQueue, [c]);
			state.set(atoms.songHistory, [a]);

			const { prev } = usePlayer();
			prev();

			expect(mockGet(atoms.currentSong)).toEqual(a);
			expect(mockGet(atoms.songQueue)).toEqual([b, c]);
			expect(mockGet(atoms.songHistory)).toEqual([]);
		});

		test("履歴が空なら currentSong が null になる", () => {
			const b = makeSong("b");
			state.set(atoms.currentSong, b);
			state.set(atoms.songQueue, []);
			state.set(atoms.songHistory, []);

			const { prev } = usePlayer();
			prev();

			expect(mockGet(atoms.currentSong)).toBeNull();
			expect(mockGet(atoms.songQueue)).toEqual([b]);
		});

		test("currentSong が null でもキューは変わらない", () => {
			const c = makeSong("c");
			state.set(atoms.currentSong, null);
			state.set(atoms.songQueue, [c]);
			state.set(atoms.songHistory, []);

			const { prev } = usePlayer();
			prev();

			expect(mockGet(atoms.currentSong)).toBeNull();
			expect(mockGet(atoms.songQueue)).toEqual([c]);
		});
	});

	// ─── skipTo ───────────────────────────────────────────────────────────
	describe("skipTo()", () => {
		test("指定 ID の曲までスキップし、それ以前の曲は破棄", () => {
			const a = makeSong("a");
			const b = makeSong("b");
			const c = makeSong("c");
			const d = makeSong("d");
			state.set(atoms.currentSong, a);
			state.set(atoms.songQueue, [b, c, d]);
			state.set(atoms.songHistory, []);

			const { skipTo } = usePlayer();
			skipTo("c");

			expect(mockGet(atoms.currentSong)).toEqual(c);
			expect(mockGet(atoms.songQueue)).toEqual([d]);
			expect(mockGet(atoms.songHistory)).toEqual([a]);
		});

		test("キュー先頭の曲に skipTo する", () => {
			const a = makeSong("a");
			const b = makeSong("b");
			const c = makeSong("c");
			state.set(atoms.currentSong, a);
			state.set(atoms.songQueue, [b, c]);
			state.set(atoms.songHistory, []);

			const { skipTo } = usePlayer();
			skipTo("b");

			expect(mockGet(atoms.currentSong)).toEqual(b);
			expect(mockGet(atoms.songQueue)).toEqual([c]);
			expect(mockGet(atoms.songHistory)).toEqual([a]);
		});

		test("存在しない ID でエラーをスロー", () => {
			state.set(atoms.songQueue, [makeSong("a")]);

			const { skipTo } = usePlayer();
			expect(() => skipTo("zzz")).toThrow("Target song not found");
		});
	});

	// ─── play / pause / stop ──────────────────────────────────────────────
	describe("play()", () => {
		test("AudioContext.resume → element.play → analyzer.start の順で呼ばれる", async () => {
			const { play } = usePlayer();
			await play();

			expect(mockResume).toHaveBeenCalled();
			expect(mockPlay).toHaveBeenCalled();
			expect(mockStart).toHaveBeenCalled();
			expect(mockGet(atoms.isPlaying)).toBe(true);
		});

		test("pos を指定すると currentTime が設定される", async () => {
			const { play } = usePlayer();
			await play(42);

			expect(mockAudioElement.currentTime).toBe(42);
		});
	});

	describe("pause()", () => {
		test("element.pause → analyzer.stop で isPlaying=false になる", () => {
			state.set(atoms.isPlaying, true);

			const { pause } = usePlayer();
			pause();

			expect(mockPause).toHaveBeenCalled();
			expect(mockAnalyzerStop).toHaveBeenCalled();
			expect(mockGet(atoms.isPlaying)).toBe(false);
		});
	});

	describe("stop()", () => {
		test("element.pause が呼ばれ currentSrc が off になる", () => {
			state.set(atoms.isPlaying, true);
			state.set(atoms.currentSrc, "file");

			const { stop } = usePlayer();
			stop();

			expect(mockPause).toHaveBeenCalled();
			expect(mockGet(atoms.isPlaying)).toBe(false);
			expect(mockGet(atoms.currentSrc)).toBe("off");
		});
	});
});
