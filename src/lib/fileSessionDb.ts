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

export type PersistedFSHandle =
	| { type: "directory"; handle: FileSystemDirectoryHandle }
	| { type: "files"; handles: FileSystemFileHandle[] };

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

/** Request read permission for all handles in a stored session.
 *  Returns true only if all handles are granted.
 */
export async function requestPermissionForSession(
	stored: PersistedFSHandle,
): Promise<boolean> {
	const handles: FileSystemHandle[] =
		stored.type === "directory" ? [stored.handle] : stored.handles;

	for (const h of handles) {
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
