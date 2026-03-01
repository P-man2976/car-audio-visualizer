/**
 * IndexedDB wrapper for persisting FileSystem Access API handles.
 *
 * Uses idb-keyval for a minimal, promise-based API.
 * FileSystemHandle instances are structured-cloneable and can be stored in
 * IndexedDB (unlike localStorage, which only accepts strings).  Storing a
 * handle does NOT preserve the user-granted permission — permission must be
 * re-requested via handle.requestPermission() after a page reload.
 */

import { createStore, del, get, set } from "idb-keyval";

export type PersistedFileEntry = {
	/** Song.id — used to directly map stub → handle without directory walking */
	songId: string;
	handle: FileSystemFileHandle;
};

export type PersistedFSHandle = {
	/** Per-song file handles. Direct getFile() after permission — no tree walk needed. */
	entries: PersistedFileEntry[];
	/**
	 * Directory handle present when loaded via showDirectoryPicker.
	 * Requesting permission once on this covers all descendant files.
	 */
	directoryHandle?: FileSystemDirectoryHandle;
};

const store = createStore("cav-file-session", "handles");
const KEY = "session";

export function saveSessionHandle(data: PersistedFSHandle): Promise<void> {
	return set(KEY, data, store);
}

export async function loadSessionHandle(): Promise<PersistedFSHandle | null> {
	return (await get<PersistedFSHandle>(KEY, store)) ?? null;
}

export function clearSessionHandle(): Promise<void> {
	return del(KEY, store);
}

/**
 * Merge new entries into the stored session.
 * Uses isSameEntry() to skip handles that are already stored,
 * preventing duplicate entries when the user loads more songs.
 */
export async function mergeSessionEntries(
	newEntries: PersistedFileEntry[],
	directoryHandle?: FileSystemDirectoryHandle,
): Promise<void> {
	const current = await loadSessionHandle();
	const existing = current?.entries ?? [];
	const merged = [...existing];

	for (const entry of newEntries) {
		const isDuplicate = (
			await Promise.all(merged.map((e) => e.handle.isSameEntry(entry.handle)))
		).some(Boolean);
		if (!isDuplicate) merged.push(entry);
	}

	await saveSessionHandle({
		entries: merged,
		directoryHandle: directoryHandle ?? current?.directoryHandle,
	});
}

/** Request read permission for all handles in a stored session.
 *  Returns true only if all handles are granted.
 */
export async function requestPermissionForSession(
	stored: PersistedFSHandle,
): Promise<boolean> {
	// If a directory handle is present, one permission request covers all files.
	const permHandles: FileSystemHandle[] = stored.directoryHandle
		? [stored.directoryHandle]
		: stored.entries.map((e) => e.handle);

	for (const h of permHandles) {
		// @ts-expect-error — queryPermission/requestPermission not yet in TS DOM lib
		const current = await h.queryPermission({ mode: "read" });
		if (current === "granted") continue;
		if (current === "denied") return false;
		// "prompt" — ask the browser (Chrome shows a non-blocking permission prompt)
		// @ts-expect-error
		const result = await h.requestPermission({ mode: "read" });
		if (result !== "granted") return false;
	}
	return true;
}
