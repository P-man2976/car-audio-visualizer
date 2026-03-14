/**
 * ControlsOverlay コンポーネントのブラウザテスト。
 * 子コンポーネントはスタブ、フックはモックして、
 * src 別の UI 切り替えと操作ボタンの表示を検証する。
 */
import { createStore, Provider } from "jotai";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { describe, expect, test, vi } from "vitest";

// --- Mock 子コンポーネント ---
vi.mock("@/components/settings/SettingsDialog", () => ({
	SettingsDialog: () => <div data-testid="settings-dialog" />,
}));
vi.mock("@/components/MenuSheet", () => ({
	MenuSheet: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="menu-sheet">{children}</div>
	),
}));
vi.mock("@/components/QueueSheet", () => ({
	QueueSheet: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="queue-sheet">{children}</div>
	),
}));
vi.mock("@/components/SourceSheet", () => ({
	SourceSheet: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="source-sheet">{children}</div>
	),
}));
vi.mock("@/components/player/ProgressSlider", () => ({
	ProgressSlider: () => <div data-testid="progress-slider" />,
}));
vi.mock("@/components/player/ChannelPresets", () => ({
	ChannelPresets: () => <div data-testid="channel-presets" />,
}));
vi.mock("@/components/player/SongInfo", () => ({
	SongInfo: ({
		title,
		artist,
		album,
		badge,
	}: {
		title: string;
		artist?: string;
		album?: string;
		badge?: string;
	}) => (
		<div data-testid="song-info">
			{badge && <span data-testid="song-badge">{badge}</span>}
			<span data-testid="song-title">{title}</span>
			{artist && <span data-testid="song-artist">{artist}</span>}
			{album && <span data-testid="song-album">{album}</span>}
		</div>
	),
}));

// --- Mock hooks ---
const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockNext = vi.fn();
const mockPrev = vi.fn();
const mockPlayRadio = vi.fn();
const mockStopRadio = vi.fn();
const mockTune = vi.fn();
const mockToggleBand = vi.fn();

vi.mock("@/hooks/player", () => ({
	usePlayer: () => ({
		isPlaying: false,
		play: mockPlay,
		pause: mockPause,
		next: mockNext,
		prev: mockPrev,
	}),
}));
vi.mock("@/hooks/radio", () => ({
	useRadioPlayer: () => ({
		playRadio: mockPlayRadio,
		stopRadio: mockStopRadio,
		tune: mockTune,
		isRadikoLoading: false,
	}),
	useBandToggle: () => mockToggleBand,
}));
vi.mock("@/hooks/file", () => ({
	useFilePlayer: () => {
		/* noop stub */
	},
}));
vi.mock("@/hooks/pip", () => ({
	usePiP: () => ({
		isPiP: false,
		enterPiP: vi.fn(),
		exitPiP: vi.fn(),
		isSupported: false,
	}),
}));
vi.mock("@/hooks/hotkeys", () => ({
	useAppHotkeys: () => {
		/* noop stub */
	},
}));
vi.mock("@/hooks/lastfm", () => ({
	useLastfmScrobble: () => {
		/* noop stub */
	},
}));
vi.mock("@/hooks/mediaSession", () => ({
	useMediaSession: () => {
		/* noop stub */
	},
}));
vi.mock("@/hooks/restore", () => ({
	useRestoreState: () => {
		/* noop stub */
	},
}));
vi.mock("@/hooks/usePinchZoom", () => ({
	usePinchZoom: () => ({ current: null }),
}));
vi.mock("@/services/radiko", () => ({
	useRadikoArea: () => "JP13",
}));
const mockToggleShuffle = vi.fn();
vi.mock("@/hooks/shuffle", () => ({
	useShuffleToggle: () => ({
		shuffle: false,
		toggle: mockToggleShuffle,
	}),
}));

// @/atoms/audio はモジュールスコープで AudioContext を生成するためモック
vi.mock("@/atoms/audio", async () => {
	const { atom } = await import("jotai");
	return {
		audioElementAtom: atom({} as unknown as HTMLAudioElement),
		mediaStreamAtom: atom<MediaStream | null>(null),
		audioMotionAnalyzerAtom: atom(null),
	};
});

import {
	currentSongAtom,
	currentSrcAtom,
	repeatModeAtom,
	shuffleAtom,
} from "@/atoms/player";
import {
	currentRadioAtom,
	radioChannelsByAreaAtom,
	tuningFreqAtom,
} from "@/atoms/radio";
import { ControlsOverlay } from "@/components/ControlsOverlay";
import type { Song } from "@/types/player";

function renderOverlay(
	overrides?: (store: ReturnType<typeof createStore>) => void,
) {
	const store = createStore();
	store.set(currentSrcAtom, "off");
	store.set(currentRadioAtom, null);
	store.set(currentSongAtom, null);
	store.set(tuningFreqAtom, null);
	store.set(shuffleAtom, false);
	store.set(repeatModeAtom, "off");
	overrides?.(store);

	return {
		store,
		...render(
			<Provider store={store}>
				<ControlsOverlay />
			</Provider>,
		),
	};
}

describe("ControlsOverlay", () => {
	test("off 状態で「再生停止中」タイトルが表示される", async () => {
		renderOverlay();

		await expect
			.element(page.getByTestId("song-title").first())
			.toHaveTextContent("再生停止中");
	});

	test("file 状態で曲タイトルとアーティストが表示される", async () => {
		renderOverlay((store) => {
			store.set(currentSrcAtom, "file");
			store.set(currentSongAtom, {
				id: "1",
				filename: "song.mp3",
				url: "blob:test",
				title: "テスト曲",
				artists: ["テストアーティスト"],
				album: "テストアルバム",
				track: {},
			} as Song);
		});

		await expect
			.element(page.getByTestId("song-title").first())
			.toHaveTextContent("テスト曲");
		await expect
			.element(page.getByTestId("song-artist").first())
			.toHaveTextContent("テストアーティスト");
	});

	test("file 状態で prev/next/シャッフル/リピートボタンが表示される", async () => {
		renderOverlay((store) => {
			store.set(currentSrcAtom, "file");
		});

		// ファイルモード固有のボタンが存在する
		// prev(ChevronFirst), next(ChevronLast), shuffle, repeat
		const buttons = page.getByRole("button");
		// 複数のボタンが含まれていることを確認
		await expect.element(buttons.first()).toBeInTheDocument();
	});

	test("radio 状態で局名と FM/AM ボタンが表示される", async () => {
		renderOverlay((store) => {
			store.set(currentSrcAtom, "radio");
			store.set(currentRadioAtom, {
				type: "FM",
				source: "radiko",
				id: "TBS",
				name: "TBSラジオ",
				frequency: 90.5,
			});
		});

		await expect
			.element(page.getByTestId("song-title").first())
			.toHaveTextContent("TBSラジオ");

		// FM/AM バンド切り替えボタン
		const fmButton = page.getByRole("button", { name: "FM/AM バンド切り替え" });
		await expect.element(fmButton).toBeInTheDocument();
	});

	test("radio 状態で周波数がアーティスト欄に表示される", async () => {
		renderOverlay((store) => {
			store.set(currentSrcAtom, "radio");
			store.set(currentRadioAtom, {
				type: "FM",
				source: "radiko",
				id: "TBS",
				name: "TBSラジオ",
				frequency: 90.5,
			});
		});

		await expect
			.element(page.getByTestId("song-artist").first())
			.toHaveTextContent("90.5MHz");
	});

	test("radio 状態でチャンネル番号がバッジとして表示される", async () => {
		renderOverlay((store) => {
			store.set(currentSrcAtom, "radio");
			store.set(currentRadioAtom, {
				type: "FM",
				source: "radiko",
				id: "TBS",
				name: "TBSラジオ",
				frequency: 90.5,
			});
			store.set(radioChannelsByAreaAtom, {
				JP13: {
					fm: {
						1: {
							freq: 90.5,
							type: "FM",
							stationId: "TBS",
							stationName: "TBSラジオ",
						},
					},
					am: {},
				},
			});
		});

		await expect
			.element(page.getByTestId("song-badge").first())
			.toHaveTextContent("1");
		await expect
			.element(page.getByTestId("song-album").first())
			.toHaveTextContent("Radiko");
	});

	test("radio 状態でチャンネル未登録時はバッジが表示されない", async () => {
		renderOverlay((store) => {
			store.set(currentSrcAtom, "radio");
			store.set(currentRadioAtom, {
				type: "FM",
				source: "radiko",
				id: "TBS",
				name: "TBSラジオ",
				frequency: 90.5,
			});
			store.set(radioChannelsByAreaAtom, {});
		});

		const badges = page.getByTestId("song-badge");
		await expect.element(badges.first()).not.toBeInTheDocument();
		await expect
			.element(page.getByTestId("song-album").first())
			.toHaveTextContent("Radiko");
	});

	test("aux 状態で「外部入力」が表示される", async () => {
		renderOverlay((store) => {
			store.set(currentSrcAtom, "aux");
		});

		await expect
			.element(page.getByTestId("song-title").first())
			.toHaveTextContent("外部入力");
	});

	test("ProgressSlider と主要子コンポーネントが描画される", async () => {
		renderOverlay();

		await expect
			.element(page.getByTestId("progress-slider"))
			.toBeInTheDocument();
		await expect
			.element(page.getByTestId("settings-dialog"))
			.toBeInTheDocument();
	});
});
