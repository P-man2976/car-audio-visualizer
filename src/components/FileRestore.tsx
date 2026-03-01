import { useAtomValue, useSetAtom } from "jotai";
import { parseBlob } from "music-metadata";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { FolderOpen, Loader, X } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively search `dir` for a file with the given name; returns the first match. */
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

/** Reconstruct a full Song from a stub + a file (new blob URLs). */
async function rehydrateSong(
	stub: SongStub,
	dir: FileSystemDirectoryHandle,
): Promise<Song | null> {
	const fileHandle = await findFileInDir(dir, stub.filename);
	if (!fileHandle) return null;

	const file = await fileHandle.getFile();
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
		// artwork extraction failures are non-fatal
	}

	return { ...stub, url, artwork };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Shows a "前回のファイルを復元" banner when there is a persisted file session.
 * The user picks the same directory via showDirectoryPicker; files are matched
 * by filename and restored into the runtime atoms.
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
	const [isRestoring, setIsRestoring] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!hasSession) return null;

	const clearAll = () => {
		clearPersistedCurrent(null);
		clearPersistedQueue([]);
		clearPersistedHistory([]);
	};

	const handleRestore = async () => {
		setError(null);
		const dirHandle = await showDirectoryPicker({ mode: "read" }).catch(
			() => null,
		);
		if (!dirHandle) return; // user cancelled

		setIsRestoring(true);
		try {
			// Rehydrate current, queue, history in parallel
			const [restoredCurrent, restoredQueue, restoredHistory] =
				await Promise.all([
					persistedCurrent ? rehydrateSong(persistedCurrent, dirHandle) : null,
					Promise.all(
						persistedQueue.map((s) => rehydrateSong(s, dirHandle)),
					).then((results) => results.filter((s): s is Song => s !== null)),
					Promise.all(
						persistedHistory.map((s) => rehydrateSong(s, dirHandle)),
					).then((results) => results.filter((s): s is Song => s !== null)),
				]);

			if (!restoredCurrent && restoredQueue.length === 0) {
				setError(
					"選択したフォルダに前回のファイルが見つかりませんでした。\nサブフォルダも含めて検索しましたが一致するファイルがありません。",
				);
				return;
			}

			if (restoredCurrent) {
				setCurrentSong(restoredCurrent);
				setQueue(restoredQueue);
				setHistory(restoredHistory);
			} else {
				// Current song was not found; promote first queue item
				const [first, ...rest] = restoredQueue;
				setCurrentSong(first);
				setQueue(rest);
				setHistory(restoredHistory);
			}

			setCurrentSrc("file");
			clearAll();
		} finally {
			setIsRestoring(false);
		}
	};

	const title = persistedCurrent?.title ?? persistedCurrent?.filename;
	const totalCount =
		(persistedCurrent ? 1 : 0) +
		persistedQueue.length +
		persistedHistory.length;

	return (
		<div className="flex flex-col gap-2 rounded-md border border-neutral-700 bg-neutral-900/60 p-3">
			<p className="text-sm text-neutral-300">
				前回のファイル再生セッションが見つかりました
				{title && (
					<>
						{" "}
						（<span className="font-medium text-white">{title}</span>
						{totalCount > 1 && ` ほか ${totalCount - 1} 曲`}）
					</>
				)}
			</p>
			{error && (
				<p className="text-xs text-red-400 whitespace-pre-wrap">{error}</p>
			)}
			<div className="flex gap-2">
				<Button
					className="flex-1 gap-2"
					onClick={handleRestore}
					disabled={isRestoring}
				>
					{isRestoring ? (
						<Loader className="h-4 w-4 animate-spin" />
					) : (
						<FolderOpen className="h-4 w-4" />
					)}
					{isRestoring ? "復元中..." : "前回のファイルを復元"}
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={clearAll}
					disabled={isRestoring}
					title="スキップ（セッションを破棄）"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
