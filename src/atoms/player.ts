import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { Song, SongStub } from "@/types/player";
import type { Radio } from "../types/radio";

export type Source = "off" | "radio" | "aux" | "file";

// aux モードは再起動時に権限が必要なため "off" に戻す
const _currentSrcAtom = atomWithStorage<Source>("cav-current-src-v2", "off");
export const currentSrcAtom = atom(
	(get) => {
		const src = get(_currentSrcAtom);
		return src === "aux" ? "off" : src;
	},
	(_get, set, value: Source) => set(_currentSrcAtom, value),
);
export const isPlayingAtom = atom(false);
export const progressAtom = atom(0);
export const volumeAtom = atom(70);
/** ミュート状態。true のとき audioElement.muted を true にする */
export const muteAtom = atom(false);

/** ファイル再生: シャッフル / リピートモード */
export type RepeatMode = "off" | "one" | "all";
export const shuffleAtom = atom(false);
export const repeatModeAtom = atom<RepeatMode>("off");

/** Radio recently-played stations */
export const queueAtom = atom<Radio[]>([]);

/** File playback */
export const currentSongAtom = atom<Song | null>(null);
export const songQueueAtom = atom<Song[]>([]);
export const songHistoryAtom = atom<Song[]>([]);

// ─── Persisted file-session stubs ─────────────────────────────────────────────
// These survive page reloads and are used to restore the file queue after the
// user re-grants directory access via showDirectoryPicker.
// They are intentionally separate from the runtime atoms so that blob URLs in
// the runtime atoms are never accidentally serialised.
export const persistedCurrentSongAtom = atomWithStorage<SongStub | null>(
	"cav-file-current-v1",
	null,
);
export const persistedSongQueueAtom = atomWithStorage<SongStub[]>(
	"cav-file-queue-v1",
	[],
);
export const persistedSongHistoryAtom = atomWithStorage<SongStub[]>(
	"cav-file-history-v1",
	[],
);
/** True when there is a persisted file session that can be restored. */
export const hasPersistedFileSessionAtom = atom(
	(get) =>
		get(persistedCurrentSongAtom) !== null ||
		get(persistedSongQueueAtom).length > 0,
);
