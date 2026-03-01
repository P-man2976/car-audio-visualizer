/**
 * IndexedDB wrapper for persisting FileSystem Access API handles.
 *
 * FileSystemHandle instances are structured-cloneable and can be stored in
 * IndexedDB (unlike localStorage, which only accepts strings).  Storing a
 * handle does NOT preserve the user-granted permission — permission must be
 * re-requested via handle.requestPermission() after a page reload.
 */

export type PersistedFSHandle =
	| { type: "directory"; handle: FileSystemDirectoryHandle }
	| { type: "files"; handles: FileSystemFileHandle[] };

const DB_NAME = "cav-file-session";
const STORE_NAME = "handles";
const KEY = "session";

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			req.result.createObjectStore(STORE_NAME);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function saveSessionHandle(
	data: PersistedFSHandle,
): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).put(data, KEY);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function loadSessionHandle(): Promise<PersistedFSHandle | null> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const req = tx.objectStore(STORE_NAME).get(KEY);
		req.onsuccess = () => resolve((req.result as PersistedFSHandle) ?? null);
		req.onerror = () => reject(req.error);
	});
}

export async function clearSessionHandle(): Promise<void> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).delete(KEY);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
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
