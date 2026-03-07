import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
	atomWithIDB,
	createDirectoryHandleArrayStorage,
	createSongArrayStorage,
	createSongStorage,
} from "@/lib/idbStorage";
import type { Song } from "@/types/player";
import type { Radio } from "../types/radio";

export type Source = "off" | "radio" | "aux" | "file";

// "radio" / "file" / "off" のみ localStorage に永続化する。
// "aux" は再起動時に権限が失われるためストレージには保存しない。
const _persistedSrcAtom = atomWithStorage<Exclude<Source, "aux">>(
	"cav-current-src-v2",
	"off",
);
// ランタイム限定の aux フラグ。リロードで false にリセットされる。
const _auxActiveAtom = atom(false);

export const currentSrcAtom = atom(
	(get): Source => (get(_auxActiveAtom) ? "aux" : get(_persistedSrcAtom)),
	(_get, set, value: Source) => {
		if (value === "aux") {
			set(_auxActiveAtom, true);
			// ストレージへは書かない（リロード後は "off" から始める）
		} else {
			set(_auxActiveAtom, false);
			set(_persistedSrcAtom, value);
		}
	},
);
export const isPlayingAtom = atom(false);
export const progressAtom = atom(0);
export const volumeAtom = atom(100);
/** ミュート状態。true のとき audioElement.muted を true にする */
export const muteAtom = atom(false);

/** ファイル再生: シャッフル / リピートモード */
export type RepeatMode = "off" | "one" | "all";
export const shuffleAtom = atom(false);
export const repeatModeAtom = atom<RepeatMode>("off");

/** シャッフル前のキュー順序。シャッフル解除時に復元するために保持（ランタイムのみ） */
export const preShuffleQueueAtom = atom<Song[] | null>(null);

/** Radio recently-played stations */
export const queueAtom = atom<Radio[]>([]);

// ─── File playback atoms (IndexedDB-backed) ───────────────────────────────────
// Blob URLs (url, artwork) are stripped on write by the IDB storage adapter.
// FileSystemFileHandle is structured-cloneable and persisted directly in IDB.
// On page reload the atoms hydrate from IDB with metadata + handles (no blob
// URLs). FileRestore then requests permission, reads files, and populates
// the blob URLs.

export const currentSongAtom = atomWithIDB<Song | null>(
	"cav-current-song-v2",
	null,
	createSongStorage(),
);

export const songQueueAtom = atomWithIDB<Song[]>(
	"cav-song-queue-v2",
	[],
	createSongArrayStorage(),
);

export const songHistoryAtom = atomWithIDB<Song[]>(
	"cav-song-history-v2",
	[],
	createSongArrayStorage(),
);

/**
 * Saved directory handles — persisted in IDB for permission re-request.
 * Requesting permission once on a directory handle covers all descendant files.
 * Handles are deduplicated by name (the directory's base name).
 */
export const savedDirectoryHandlesAtom = atomWithIDB<
	FileSystemDirectoryHandle[]
>("cav-dir-handles-v2", [], createDirectoryHandleArrayStorage());

/** True when there is a persisted file session that can be restored. */
export const hasPersistedFileSessionAtom = atom(
	(get) => get(currentSongAtom) !== null || get(songQueueAtom).length > 0,
);
