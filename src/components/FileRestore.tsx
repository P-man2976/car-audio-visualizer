import { useAtomValue, useSetAtom } from "jotai";
import { parseBlob } from "music-metadata";
import { useEffect, useRef, useState } from "react";
import {
	currentSongAtom,
	currentSrcAtom,
	hasPersistedFileSessionAtom,
	persistedCurrentSongAtom,
	persistedSongHistoryAtom,
	persistedSongQueueAtom,
	songHistoryAtom,
	songQueueAtom,
} from "@/atoms/player";
import type { Song, SongStub } from "@/types/player";
import { Loader } from "lucide-react";
import {
	clearSessionHandle,
	loadSessionHandle,
	requestPermissionForSession,
	type PersistedFSHandle,
} from "@/lib/fileSessionDb";

// ─── Rehydration helpers ──────────────────────────────────────────────────────

async function buildSongFromFile(stub: SongStub, file: File): Promise<Song> {
	const url = URL.createObjectURL(file);
	let artwork: string | undefined;
	try {
		const { common } = await parseBlob(file);
		if (common.picture?.[0]) {
			const pic = common.picture[0];
			artwork = URL.createObjectURL(
				new Blob([new Uint8Array(pic.data)], { type: pic.format }),
			);
		}
	} catch {
		// non-fatal
	}
	return { ...stub, url, artwork };
}

/** Find a file by name inside a directory (recursive). */
async function findFileInDir(
	dir: FileSystemDirectoryHandle,
	name: string,
): Promise<FileSystemFileHandle | null> {
	for await (const [entryName, handle] of dir.entries()) {
		if (handle.kind === "file" && entryName === name) {
			return handle as FileSystemFileHandle;
		}
		if (handle.kind === "directory") {
			const found = await findFileInDir(
				handle as FileSystemDirectoryHandle,
				name,
			);
			if (found) return found;
		}
	}
	return null;
}

async function rehydrateFromDir(
	stubs: SongStub[],
	dir: FileSystemDirectoryHandle,
): Promise<Song[]> {
	const results = await Promise.all(
		stubs.map(async (stub) => {
			const h = await findFileInDir(dir, stub.filename);
			if (!h) return null;
			return buildSongFromFile(stub, await h.getFile());
		}),
	);
	return results.filter((s): s is Song => s !== null);
}

async function rehydrateFromFileHandles(
	stubs: SongStub[],
	handles: FileSystemFileHandle[],
): Promise<Song[]> {
	const byName = new Map(handles.map((h) => [h.name, h]));
	const results = await Promise.all(
		stubs.map(async (stub) => {
			const h = byName.get(stub.filename);
			if (!h) return null;
			return buildSongFromFile(stub, await h.getFile());
		}),
	);
	return results.filter((s): s is Song => s !== null);
}

// ─── Component ────────────────────────────────────────────────────────────────

type RestoreState =
	| { status: "idle" }
	| { status: "restoring" }
	| { status: "needs-permission"; stored: PersistedFSHandle }
	| { status: "done" };

/**
 * Automatically restores a file playback session after page reload.
 *
 * On mount it:
 *   1. Checks for persisted song stubs (via hasPersistedFileSessionAtom)
 *   2. Loads the FileSystem handle(s) stored in IndexedDB
 *   3. Calls requestPermission() — Chrome shows a non-blocking permission bar
 *   4. If granted, rehydrates Songs (new blob URLs) and pushes to runtime atoms
 *
 * Place this component outside any Sheet/Dialog so it mounts at app load.
 */
export function FileRestore() {
	const hasSession = useAtomValue(hasPersistedFileSessionAtom);
	const persistedCurrent = useAtomValue(persistedCurrentSongAtom);
	const persistedQueue = useAtomValue(persistedSongQueueAtom);
	const persistedHistory = useAtomValue(persistedSongHistoryAtom);

	const setCurrentSong = useSetAtom(currentSongAtom);
	const setQueue = useSetAtom(songQueueAtom);
	const setHistory = useSetAtom(songHistoryAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);
	const clearPersistedCurrent = useSetAtom(persistedCurrentSongAtom);
	const clearPersistedQueue = useSetAtom(persistedSongQueueAtom);
	const clearPersistedHistory = useSetAtom(persistedSongHistoryAtom);

	const [state, setState] = useState<RestoreState>({ status: "idle" });
	const didRun = useRef(false);

	const clearAll = () => {
		clearPersistedCurrent(null);
		clearPersistedQueue([]);
		clearPersistedHistory([]);
		clearSessionHandle().catch(() => undefined);
	};

	const doRestore = async (stored: PersistedFSHandle) => {
		setState({ status: "restoring" });

		const allStubs: SongStub[] = [
			...(persistedCurrent ? [persistedCurrent] : []),
			...persistedQueue,
			...persistedHistory,
		];

		let restored: Song[];
		try {
			restored =
				stored.type === "directory"
					? await rehydrateFromDir(allStubs, stored.handle)
					: await rehydrateFromFileHandles(allStubs, stored.handles);
		} catch {
			clearAll();
			setState({ status: "done" });
			return;
		}

		const byFilename = new Map(restored.map((s) => [s.filename, s]));

		const restoredCurrent = persistedCurrent
			? (byFilename.get(persistedCurrent.filename) ?? null)
			: null;
		const restoredQueue = persistedQueue
			.map((s) => byFilename.get(s.filename))
			.filter((s): s is Song => s !== undefined);
		const restoredHistory = persistedHistory
			.map((s) => byFilename.get(s.filename))
			.filter((s): s is Song => s !== undefined);

		if (!restoredCurrent && restoredQueue.length === 0) {
			clearAll();
			setState({ status: "done" });
			return;
		}

		if (restoredCurrent) {
			setCurrentSong(restoredCurrent);
			setQueue(restoredQueue);
			setHistory(restoredHistory);
		} else {
			const [first, ...rest] = restoredQueue;
			setCurrentSong(first);
			setQueue(rest);
			setHistory(restoredHistory);
		}
		setCurrentSrc("file");
		clearAll();
		setState({ status: "done" });
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only effect, doRestore excluded intentionally
	useEffect(() => {
		if (didRun.current || !hasSession) return;
		didRun.current = true;

		(async () => {
			const stored = await loadSessionHandle().catch(() => null);
			if (!stored) return;

			const granted = await requestPermissionForSession(stored).catch(
				() => false,
			);
			if (!granted) {
				setState({ status: "needs-permission", stored });
				return;
			}
			await doRestore(stored);
		})();
	}, [hasSession]);

	if (state.status === "restoring") {
		return (
			<div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900/80 px-4 py-2 text-sm text-neutral-300 shadow-lg backdrop-blur-sm">
				<Loader className="h-4 w-4 animate-spin" />
				前回のファイルを復元中...
			</div>
		);
	}

	if (state.status === "needs-permission") {
		const { stored } = state;
		return (
			<div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-neutral-900/80 px-4 py-2 text-sm text-neutral-300 shadow-lg backdrop-blur-sm">
				<span>前回のファイルへのアクセスを許可してください</span>
				<button
					type="button"
					className="rounded-full bg-neutral-700 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-600"
					onClick={() => doRestore(stored)}
				>
					許可する
				</button>
				<button
					type="button"
					className="rounded-full px-2 py-1 text-xs text-neutral-500 hover:text-neutral-300"
					onClick={() => {
						clearAll();
						setState({ status: "done" });
					}}
				>
					×
				</button>
			</div>
		);
	}

	return null;
}
