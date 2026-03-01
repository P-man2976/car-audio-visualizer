import { useAtomValue, useSetAtom } from "jotai";
import { parseBlob } from "music-metadata";
import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
 * Notifications are shown using sonner toast system:
 *   - Loading toast when restoring files
 *   - Success toast when complete
 *   - Action toast if permission needs approval (with user gesture)
 *   - Error toast if restoration fails
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

	const restoringToastId = useRef<string | number | null>(null);
	const permissionToastId = useRef<string | number | null>(null);

	const clearAll = useCallback(() => {
		clearPersistedCurrent(null);
		clearPersistedQueue([]);
		clearPersistedHistory([]);
		clearSessionHandle().catch(() => undefined);
	}, [clearPersistedCurrent, clearPersistedQueue, clearPersistedHistory]);

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
			// persisted stubs と IDB ハンドルは残す。
			// clearAll() を呼ぶと 2 回目以降のリロードで復元できなくなる。
			// stubs は next/prev/skipTo/FilePicker により常に最新状態に更新される。

			// Close loading toast and show success
			if (restoringToastId.current) {
				toast.dismiss(restoringToastId.current);
				restoringToastId.current = null;
			}
			toast.success("前回のファイルを復元しました");
		},
		onError: () => {
			// Close loading toast and show error
			if (restoringToastId.current) {
				toast.dismiss(restoringToastId.current);
				restoringToastId.current = null;
			}
			toast.error("ファイルの復元に失敗しました");
			clearAll();
		},
	});

	// Auto-restore when permission was already granted without user gesture
	useEffect(() => {
		if (permissionData?.granted) {
			// Show loading toast
			if (!restoringToastId.current && !isRestoring) {
				restoringToastId.current = toast.loading("前回のファイルを復元中...");
			}
			restore(permissionData.stored);
		}
	}, [permissionData, restore, isRestoring]);

	// Show loading toast when restore mutation starts
	useEffect(() => {
		if (isRestoring && !restoringToastId.current) {
			restoringToastId.current = toast.loading("前回のファイルを復元中...");
		}
	}, [isRestoring]);

	// Show permission request
	useEffect(() => {
		if (permissionData && !permissionData.granted) {
			const { stored } = permissionData;
			const handleAllow = async () => {
				const granted = await requestPermissionForSession(stored).catch(
					() => false,
				);
				if (granted) {
					if (permissionToastId.current) {
						toast.dismiss(permissionToastId.current);
						permissionToastId.current = null;
					}
					restore(stored);
				} else {
					toast.error("ファイルへのアクセスが拒否されました");
					clearAll();
				}
			};

			const handleDeny = () => {
				if (permissionToastId.current) {
					toast.dismiss(permissionToastId.current);
					permissionToastId.current = null;
				}
				clearAll();
			};

			if (!permissionToastId.current) {
				permissionToastId.current = toast(
					"前回のファイルへのアクセスを許可してください",
					{
						action: {
							label: "許可する",
							onClick: handleAllow,
						},
						cancel: {
							label: "キャンセル",
							onClick: handleDeny,
						},
					},
				);
			}
		}
	}, [permissionData, restore, clearAll]);

	return null;
}
