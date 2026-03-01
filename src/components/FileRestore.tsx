import { useAtomValue, useSetAtom } from "jotai";
import { parseBlob } from "music-metadata";
import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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

/**
 * Rehydrate songs from stored FileSystemFileHandle entries.
 * Each entry is keyed by songId, so no directory walking or filename matching
 * is needed — the handle already points to the exact file.
 * isSameEntry() deduplication is handled at save time (mergeSessionEntries).
 */
async function rehydrateFromEntries(
	stubs: SongStub[],
	stored: PersistedFSHandle,
): Promise<Song[]> {
	const handleMap = new Map(stored.entries.map((e) => [e.songId, e.handle]));
	const results = await Promise.all(
		stubs.map(async (stub) => {
			const handle = handleMap.get(stub.id);
			if (!handle) return null;
			return buildSongFromFile(stub, await handle.getFile());
		}),
	);
	return results.filter((s): s is Song => s !== null);
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Automatically restores a file playback session after page reload.
 *
 * Flow:
 *   useQuery  — loads IDB handle + calls requestPermission() on mount
 *   useMutation — rehydrates Song objects from handles and pushes to atoms
 *   useEffect — auto-fires the mutation when permission is already granted
 *
 * If permission needs a user gesture, a prompt bar is shown instead.
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

	const clearAll = () => {
		clearPersistedCurrent(null);
		clearPersistedQueue([]);
		clearPersistedHistory([]);
		clearSessionHandle().catch(() => undefined);
	};

	// Step 1: Load IDB handle and attempt permission (auto, no gesture needed in Chrome)
	const { data: permissionData } = useQuery({
		queryKey: ["file-session-permission"],
		queryFn: async () => {
			const stored = await loadSessionHandle();
			if (!stored) return null;
			const granted = await requestPermissionForSession(stored).catch(
				() => false,
			);
			return { stored, granted };
		},
		enabled: hasSession,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 0,
		retry: false,
	});

	// Step 2: Rehydrate Song objects from handles and push to atoms
	const { mutate: restore, isPending: isRestoring } = useMutation({
		mutationFn: (stored: PersistedFSHandle) => {
			const allStubs: SongStub[] = [
				...(persistedCurrent ? [persistedCurrent] : []),
				...persistedQueue,
				...persistedHistory,
			];
			return rehydrateFromEntries(allStubs, stored);
		},
		onSuccess: (restored) => {
			const byId = new Map(restored.map((s) => [s.id, s]));
			const restoredCurrent = persistedCurrent
				? (byId.get(persistedCurrent.id) ?? null)
				: null;
			const restoredQueue = persistedQueue
				.map((s) => byId.get(s.id))
				.filter((s): s is Song => s !== undefined);
			const restoredHistory = persistedHistory
				.map((s) => byId.get(s.id))
				.filter((s): s is Song => s !== undefined);

			if (restoredCurrent || restoredQueue.length > 0) {
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
			}
			clearAll();
		},
		onError: clearAll,
	});

	// Auto-restore when permission was already granted without user gesture
	useEffect(() => {
		if (permissionData?.granted) {
			restore(permissionData.stored);
		}
	}, [permissionData, restore]);

	if (isRestoring) {
		return (
			<div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900/80 px-4 py-2 text-sm text-neutral-300 shadow-lg backdrop-blur-sm">
				<Loader className="h-4 w-4 animate-spin" />
				前回のファイルを復元中...
			</div>
		);
	}

	if (permissionData && !permissionData.granted) {
		const { stored } = permissionData;
		return (
			<div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-neutral-900/80 px-4 py-2 text-sm text-neutral-300 shadow-lg backdrop-blur-sm">
				<span>前回のファイルへのアクセスを許可してください</span>
				<button
					type="button"
					className="rounded-full bg-neutral-700 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-600"
					onClick={async () => {
						const granted = await requestPermissionForSession(stored).catch(
							() => false,
						);
						if (granted) restore(stored);
						else clearAll();
					}}
				>
					許可する
				</button>
				<button
					type="button"
					className="rounded-full px-2 py-1 text-xs text-neutral-500 hover:text-neutral-300"
					onClick={clearAll}
				>
					×
				</button>
			</div>
		);
	}

	return null;
}
