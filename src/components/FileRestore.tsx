import { useAtomValue, useSetAtom } from "jotai";
import { parseBlob } from "music-metadata";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	currentSongAtom,
	currentSrcAtom,
	directoryHandleAtom,
	hasPersistedFileSessionAtom,
	songHistoryAtom,
	songQueueAtom,
} from "@/atoms/player";
import type { Song } from "@/types/player";
import {
	clearLegacySessionStore,
	requestPermission,
} from "@/lib/fileSessionDb";

// ─── Rehydration helpers ──────────────────────────────────────────────────────

/**
 * Create blob URLs (audio + artwork) for a Song that has a FileSystemFileHandle
 * but no runtime blob URL yet.
 */
async function hydrateSong(song: Song): Promise<Song> {
	if (song.url) return song; // already hydrated
	if (!song.handle) return song; // no handle — can't hydrate
	const file = await song.handle.getFile();
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
	return { ...song, url, artwork };
}

async function hydrateSongs(songs: Song[]): Promise<Song[]> {
	return Promise.all(songs.map(hydrateSong));
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Automatically restores a file playback session after page reload.
 *
 * Song atoms are backed by IndexedDB and include FileSystemFileHandle.
 * After IDB hydration, this component:
 *   1. Collects handles from the atom values
 *   2. Requests read permission (directory handle preferred for bulk grant)
 *   3. Creates blob URLs from the file handles
 *   4. Updates the atoms with the hydrated Song objects
 */
export function FileRestore() {
	const hasSession = useAtomValue(hasPersistedFileSessionAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const isFileSystemAccessSupported =
		typeof window !== "undefined" && "FileSystemFileHandle" in window;
	const shouldRestore =
		hasSession && currentSrc === "file" && isFileSystemAccessSupported;

	const currentSong = useAtomValue(currentSongAtom);
	const queue = useAtomValue(songQueueAtom);
	const history = useAtomValue(songHistoryAtom);
	const dirHandle = useAtomValue(directoryHandleAtom);

	const setCurrentSong = useSetAtom(currentSongAtom);
	const setQueue = useSetAtom(songQueueAtom);
	const setHistory = useSetAtom(songHistoryAtom);

	const restoringToastId = useRef<string | number | null>(null);
	const permissionToastId = useRef<string | number | null>(null);
	const hasAutoRestored = useRef(false);

	/**
	 * Determine whether hydration is needed: at least one song has a handle but
	 * no blob URL.
	 */
	const allSongs = useMemo(
		() => [...(currentSong ? [currentSong] : []), ...queue, ...history],
		[currentSong, queue, history],
	);
	const needsHydration =
		shouldRestore && allSongs.some((s) => s.handle && !s.url);

	/** Collect unique handles for permission request. */
	const getPermissionHandles = useCallback((): FileSystemHandle[] => {
		if (dirHandle) return [dirHandle];
		const handles: FileSystemHandle[] = [];
		for (const s of allSongs) {
			if (s.handle) handles.push(s.handle);
		}
		return handles;
	}, [dirHandle, allSongs]);

	const clearAll = useCallback(() => {
		setCurrentSong(null);
		setQueue([]);
		setHistory([]);
		clearLegacySessionStore().catch(() => undefined);
	}, [setCurrentSong, setQueue, setHistory]);

	// Cleanup legacy IDB store from previous architecture
	useEffect(() => {
		clearLegacySessionStore().catch(() => undefined);
	}, []);

	// FSA 未サポートブラウザではハンドルが使えないためクリア
	useEffect(() => {
		if (!isFileSystemAccessSupported && hasSession) {
			clearAll();
		}
	}, [isFileSystemAccessSupported, hasSession, clearAll]);

	// Step 1: Attempt permission (auto-grant in Chrome for previously-granted handles)
	const { data: permissionData } = useQuery({
		queryKey: ["file-session-permission"],
		queryFn: async () => {
			const handles = getPermissionHandles();
			if (handles.length === 0) return null;
			const granted = await requestPermission(handles).catch(() => false);
			return { granted };
		},
		enabled: needsHydration,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 0,
		retry: false,
	});

	// Step 2: Hydrate blob URLs from handles
	const { mutate: restore, isPending: isRestoring } = useMutation({
		mutationFn: async () => {
			const hydratedCurrent = currentSong
				? await hydrateSong(currentSong)
				: null;
			const hydratedQueue = await hydrateSongs(queue);
			const hydratedHistory = await hydrateSongs(history);
			return {
				current: hydratedCurrent,
				queue: hydratedQueue,
				history: hydratedHistory,
			};
		},
		onSuccess: ({ current, queue: q, history: h }) => {
			if (current) setCurrentSong(current);
			if (q.length > 0) setQueue(q);
			if (h.length > 0) setHistory(h);

			if (restoringToastId.current) {
				toast.dismiss(restoringToastId.current);
				restoringToastId.current = null;
			}
			toast.success("前回のファイルを復元しました", { position: "top-right" });
		},
		onError: () => {
			if (restoringToastId.current) {
				toast.dismiss(restoringToastId.current);
				restoringToastId.current = null;
			}
			toast.error("ファイルの復元に失敗しました", { position: "top-right" });
			clearAll();
		},
	});

	// Auto-restore when permission already granted
	useEffect(() => {
		if (permissionData?.granted && !hasAutoRestored.current) {
			hasAutoRestored.current = true;
			restore();
		}
	}, [permissionData, restore]);

	// Loading toast
	useEffect(() => {
		if (isRestoring && !restoringToastId.current) {
			restoringToastId.current = toast.loading("前回のファイルを復元中...", {
				position: "top-right",
			});
		}
	}, [isRestoring]);

	// Permission request UI
	useEffect(() => {
		if (permissionData && !permissionData.granted) {
			const handleAllow = async () => {
				const handles = getPermissionHandles();
				const granted = await requestPermission(handles).catch(() => false);
				if (granted) {
					if (permissionToastId.current) {
						toast.dismiss(permissionToastId.current);
						permissionToastId.current = null;
					}
					restore();
				} else {
					toast.error("ファイルへのアクセスが拒否されました", {
						position: "top-right",
					});
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
						position: "top-right",
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
	}, [permissionData, restore, clearAll, getPermissionHandles]);

	return null;
}
