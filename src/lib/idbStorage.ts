/**
 * IndexedDB-backed AsyncStorage adapter for Jotai atomWithStorage.
 *
 * FileSystemFileHandle is structured-cloneable and stored natively in IDB.
 * Blob URLs (url, artwork) are stripped before persistence since they become
 * invalid after page reload.
 *
 * The IDB store is created lazily on first use to avoid calling
 * indexedDB.open() during SSR (server has no IndexedDB).
 *
 * atomWithIDB resolves the IDB Promise in onMount *before* calling setAtom,
 * preventing the base atom from holding a raw Promise (which would break
 * updater functions like `setQueue(prev => [...prev, ...songs])`).
 */

import { atom } from "jotai";
import type { SetStateAction } from "jotai";
import { createStore, del, get, set } from "idb-keyval";
import type { Song } from "@/types/player";

/** Lazy singleton — only created when running in the browser. */
let _store: ReturnType<typeof createStore> | undefined;
function getStore() {
	if (!_store) {
		_store = createStore("cav-atoms", "store");
	}
	return _store;
}

/** Strip runtime-only blob URL fields before IDB persistence. */
function stripEphemeral(song: Song): Omit<Song, "url" | "artwork"> {
	const { url: _url, artwork: _artwork, ...rest } = song;
	return rest;
}

// ─── Generic atomWithIDB ────────────────────────────────────────────────
// Jotai's built-in atomWithStorage calls `setAtom(storage.getItem(...))`
// which passes the raw Promise to setAtom. The base atom's value becomes
// a Promise, and `get(baseAtom)` in the write function returns the Promise
// rather than the actual data.  Updater functions like
// `(prev) => [...prev, ...items]` then receive a Promise as `prev`,
// causing `prev.length === undefined` and `[...prev]` to throw a TypeError.
//
// atomWithIDB resolves the Promise first: `getItem().then(setAtom)`.
// The base atom value transitions from `initialValue` directly to the
// hydrated value, never becoming a Promise.

interface IDBStorage<T> {
	getItem: (key: string, initialValue: T) => Promise<T>;
	setItem: (key: string, value: T) => Promise<void>;
	removeItem: (key: string) => Promise<void>;
}

/**
 * Like Jotai's atomWithStorage, but safe for async (IDB) storage.
 * The Promise from getItem is resolved before calling setAtom,
 * so the base atom never holds a raw Promise.
 */
export function atomWithIDB<T>(
	key: string,
	initialValue: T,
	storage: IDBStorage<T>,
) {
	const baseAtom = atom(initialValue);

	baseAtom.onMount = (setAtom) => {
		// Resolve the Promise BEFORE calling setAtom.
		// This ensures get(baseAtom) always returns T, never Promise<T>.
		storage.getItem(key, initialValue).then(setAtom);
	};

	const wrapper = atom(
		(get) => get(baseAtom),
		(get, _set, update: SetStateAction<T>) => {
			const nextValue =
				typeof update === "function"
					? (update as (prev: T) => T)(get(baseAtom))
					: update;
			_set(baseAtom, nextValue);
			return storage.setItem(key, nextValue);
		},
	);

	return wrapper;
}

// ─── IDB storage factories ──────────────────────────────────────────────

/**
 * IDBStorage<Song | null> — stores in IndexedDB.
 * Blob URLs are stripped on write; FileSystemFileHandle is preserved.
 */
export function createSongStorage(): IDBStorage<Song | null> {
	return {
		getItem: async (key, initialValue) => {
			const v = await get<Omit<Song, "url" | "artwork"> | null>(
				key,
				getStore(),
			);
			return v !== undefined ? (v as Song | null) : initialValue;
		},
		setItem: async (key, value) => {
			await set(key, value ? stripEphemeral(value) : null, getStore());
		},
		removeItem: (key) => del(key, getStore()),
	};
}

/**
 * IDBStorage<Song[]> — stores in IndexedDB.
 * Blob URLs are stripped on write; FileSystemFileHandle is preserved.
 */
export function createSongArrayStorage(): IDBStorage<Song[]> {
	return {
		getItem: async (key, initialValue) => {
			const v = await get<Array<Omit<Song, "url" | "artwork">>>(
				key,
				getStore(),
			);
			return v !== undefined ? (v as Song[]) : initialValue;
		},
		setItem: async (key, value) => {
			await set(
				key,
				value.map((s) => stripEphemeral(s)),
				getStore(),
			);
		},
		removeItem: (key) => del(key, getStore()),
	};
}

/**
 * IDBStorage<FileSystemDirectoryHandle[]> for saved explorer directory handles.
 * Handles are structured-cloneable and stored natively in IDB.
 */
export function createDirectoryHandleArrayStorage(): IDBStorage<
	FileSystemDirectoryHandle[]
> {
	return {
		getItem: async (key, initialValue) => {
			const v = await get<FileSystemDirectoryHandle[]>(key, getStore());
			if (v !== undefined) return v;
			// Migrate from old single-handle key (cav-dir-handle-v1)
			const legacy = await get<FileSystemDirectoryHandle | null>(
				"cav-dir-handle-v1",
				getStore(),
			);
			if (legacy) {
				const migrated = [legacy];
				await set(key, migrated, getStore());
				await del("cav-dir-handle-v1", getStore());
				return migrated;
			}
			return initialValue;
		},
		setItem: async (key, value) => {
			await set(key, value, getStore());
		},
		removeItem: (key) => del(key, getStore()),
	};
}
