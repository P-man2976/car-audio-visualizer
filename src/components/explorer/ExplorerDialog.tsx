import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { FileEntries } from "./FileEntries";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import mime from "mime/lite";
import { explorerSelectedFilesAtom } from "@/atoms/explorer";
import { useMutation } from "@tanstack/react-query";
import { Address } from "./Address";
import { useAddress } from "@/hooks/explorer";
import { Button } from "../ui/button";
import { parseBlob } from "music-metadata";
import { audioElementAtom } from "@/atoms/audio";
import {
	currentSongAtom,
	currentSrcAtom,
	savedDirectoryHandlesAtom,
	songQueueAtom,
} from "@/atoms/player";
import { LuFolderOpen, LuLoader, LuX } from "react-icons/lu";
import type { SelectedFile } from "@/types/explorer";
import type { Song } from "@/types/player";

const hasFSAPI = "showDirectoryPicker" in window;

async function fileToSong(
	file: File,
	audioElement: HTMLAudioElement,
	handle?: FileSystemFileHandle,
): Promise<Song | undefined> {
	if (!audioElement.canPlayType(mime.getType(file.name) ?? "")) return;
	const url = URL.createObjectURL(file);
	const {
		common: { title, track, album, artists, genre, date, year, picture },
		format: { duration },
	} = await parseBlob(file);
	return {
		id: crypto.randomUUID(),
		filename: file.name,
		url,
		handle,
		title,
		track: { no: track.no ?? undefined, of: track.of ?? undefined },
		album,
		artists,
		genre,
		date,
		year,
		duration,
		artwork: picture?.[0]
			? URL.createObjectURL(
					new Blob([new Uint8Array(picture[0].data)], {
						type: picture[0].format,
					}),
				)
			: undefined,
	};
}

export function ExplorerDialog({ children }: { children: ReactNode }) {
	const audioElement = useAtomValue(audioElementAtom);
	const [selected, setSelected] = useAtom(explorerSelectedFilesAtom);
	const setQueue = useSetAtom(songQueueAtom);
	const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);
	const [savedHandles, setSavedHandles] = useAtom(savedDirectoryHandlesAtom);
	const { stack, push } = useAddress();
	const fallbackInputRef = useRef<HTMLInputElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const autoOpenedRef = useRef(false);

	// ダイアログ初回オープン時に保存済みフォルダで自動展開
	useEffect(() => {
		if (
			isOpen &&
			!autoOpenedRef.current &&
			savedHandles.length > 0 &&
			stack.length === 0
		) {
			autoOpenedRef.current = true;
			push(savedHandles[0]);
		}
	}, [isOpen, savedHandles, stack.length, push]);

	// ダイアログを閉じたらフラグリセット
	useEffect(() => {
		if (!isOpen) {
			autoOpenedRef.current = false;
		}
	}, [isOpen]);

	const handleSelectRoot = async () => {
		const handle = await showDirectoryPicker({ mode: "read" }).catch(
			() => null,
		);
		if (!handle) return;
		// 重複チェック: 同名フォルダがなければ追加
		setSavedHandles((prev) => {
			if (prev.some((h) => h.name === handle.name)) return prev;
			return [...prev, handle];
		});
		// Reset navigation to new root
		push(handle);
	};

	/** 保存済みフォルダを選択してナビゲーション */
	const handleOpenSavedFolder = (handle: FileSystemDirectoryHandle) => {
		push(handle);
	};

	/** 保存済みフォルダを削除 */
	const handleRemoveSavedFolder = (
		e: React.MouseEvent,
		handle: FileSystemDirectoryHandle,
	) => {
		e.stopPropagation();
		setSavedHandles((prev) => prev.filter((h) => h.name !== handle.name));
	};

	/** Recursively collect all FileSystemFileHandles from a selection */
	const collectFileHandles = async (
		files: SelectedFile[],
	): Promise<FileSystemFileHandle[]> => {
		const results: FileSystemFileHandle[] = [];
		for (const handle of files) {
			if (handle.kind === "directory") {
				const sub = await collectFromDir(handle as FileSystemDirectoryHandle);
				results.push(...sub);
			} else {
				results.push(handle as FileSystemFileHandle);
			}
		}
		return results;
	};

	const collectFromDir = async (
		dir: FileSystemDirectoryHandle,
	): Promise<FileSystemFileHandle[]> => {
		const results: FileSystemFileHandle[] = [];
		for await (const [, handle] of dir.entries()) {
			if (handle.kind === "directory") {
				results.push(
					...(await collectFromDir(handle as FileSystemDirectoryHandle)),
				);
			} else {
				results.push(handle as FileSystemFileHandle);
			}
		}
		return results;
	};

	const queueFile = (handle: FileSystemFileHandle) =>
		handle.getFile().then((file) => fileToSong(file, audioElement, handle));

	/** collectFileHandles with handle tracking */
	const collectHandleSongPairs = async (
		files: SelectedFile[],
	): Promise<{ handle: FileSystemFileHandle; song: Song | undefined }[]> => {
		const fileHandles = await collectFileHandles(files);
		return Promise.all(
			fileHandles.map(async (handle) => ({
				handle,
				song: await queueFile(handle),
			})),
		);
	};

	const handleFallbackChange = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = Array.from(e.target.files ?? []);
		if (!files.length) return;
		const songs = (
			await Promise.all(files.map((f) => fileToSong(f, audioElement)))
		).filter((s) => s !== undefined);
		if (!currentSong && songs.length > 0) {
			const [first, ...rest] = songs;
			setCurrentSong(first);
			setQueue((prev) => [...prev, ...rest]);
		} else {
			setQueue((prev) => [...prev, ...songs]);
		}
		setCurrentSrc("file");
		e.target.value = "";
	};

	const { mutate, isPending } = useMutation({
		mutationFn: async (files: SelectedFile[]) => {
			const pairs = await collectHandleSongPairs(files);
			const songs = pairs
				.map((p) => p.song)
				.filter((s): s is Song => s !== undefined);

			if (!currentSong && songs.length > 0) {
				const [first, ...rest] = songs;
				setCurrentSong(first);
				setQueue((prev) => [...prev, ...rest]);
			} else {
				setQueue((prev) => [...prev, ...songs]);
			}
			setCurrentSrc("file");

			// Persist directory handle for bulk permission on reload
			const rootHandle = stack[0];
			if (rootHandle) {
				setSavedHandles((prev) => {
					if (prev.some((h) => h.name === rootHandle.name)) return prev;
					return [...prev, rootHandle];
				});
			}

			setSelected([]);
		},
	});

	if (!hasFSAPI) {
		return (
			<>
				<input
					ref={fallbackInputRef}
					type="file"
					multiple
					accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.webm,.aiff,.aif"
					className="sr-only"
					onChange={handleFallbackChange}
				/>
				<span
					className="contents"
					onClick={() => fallbackInputRef.current?.click()}
				>
					{children}
				</span>
			</>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="flex flex-col h-[calc(100dvh-8rem)] sm:max-w-4xl">
				<Address />
				<div className="flex gap-1 overflow-auto h-full">
					{/* Sidebar */}
					<div className="basis-1/4 w-full flex flex-col gap-2 pt-2">
						<Button
							variant="ghost"
							className="justify-start gap-2"
							onClick={handleSelectRoot}
						>
							<LuFolderOpen />
							{stack.length > 0 ? "別のフォルダを開く" : "フォルダを選択"}
						</Button>
						{/* 保存済みフォルダ一覧 */}
						{savedHandles.length > 0 && (
							<div className="flex flex-col gap-0.5">
								<span className="text-xs text-muted-foreground px-2 pt-1">
									保存済みフォルダ
								</span>
								{savedHandles.map((h) => (
									<Button
										key={h.name}
										variant="ghost"
										size="sm"
										className="justify-start gap-2 group text-xs h-8"
										onClick={() => handleOpenSavedFolder(h)}
									>
										<LuFolderOpen className="shrink-0 size-3.5" />
										<span className="truncate">{h.name}</span>
										<button
											type="button"
											className="ml-auto opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-neutral-700"
											onClick={(e) => handleRemoveSavedFolder(e, h)}
										>
											<LuX className="size-3" />
										</button>
									</Button>
								))}
							</div>
						)}
					</div>
					<div className="self-stretch border border-gray-700" />
					{/* File listing */}
					<div className="w-full basis-3/4 overflow-auto">
						<FileEntries />
					</div>
				</div>
				<Button
					disabled={isPending || !selected.length}
					className="w-full"
					onClick={() => mutate(selected)}
				>
					{isPending ? (
						<LuLoader className="animate-spin" />
					) : (
						`選択したファイルを読み込む (${selected.length}件)`
					)}
				</Button>
			</DialogContent>
		</Dialog>
	);
}
