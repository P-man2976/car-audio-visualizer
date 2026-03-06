/**
 * Permission utilities for File System Access API handles.
 *
 * Per-song FileSystemFileHandle instances are now stored directly in Song
 * objects (persisted via IDB-backed Jotai atoms in atoms/player.ts).
 * This module provides permission request helpers and legacy cleanup.
 */

/**
 * Request read permission for a set of FileSystemHandle instances.
 * If a directory handle is provided it is checked first — a single grant
 * on a directory covers all descendant files.
 * Returns true only when all handles are granted.
 */
export async function requestPermission(
	handles: FileSystemHandle[],
): Promise<boolean> {
	for (const h of handles) {
		const current = await h.queryPermission({ mode: "read" });
		if (current === "granted") continue;
		if (current === "denied") return false;
		const result = await h.requestPermission({ mode: "read" });
		if (result !== "granted") return false;
	}
	return true;
}

/**
 * Clean up the legacy IDB store used before the atoms-based persistence
 * migration. Safe to call even if the store does not exist.
 */
export async function clearLegacySessionStore(): Promise<void> {
	try {
		const { createStore, del } = await import("idb-keyval");
		const legacyStore = createStore("cav-file-session", "handles");
		await del("session", legacyStore);
	} catch {
		// non-fatal — store may not exist
	}
}
