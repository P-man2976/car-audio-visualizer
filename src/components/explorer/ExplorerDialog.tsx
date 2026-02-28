import { useRef } from "react";
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
import { currentSongAtom, currentSrcAtom, songQueueAtom } from "@/atoms/player";
import { LuFolderOpen, LuLoader } from "react-icons/lu";
import type { SelectedFile } from "@/types/explorer";
import type { Song } from "@/types/player";

const hasFSAPI = "showDirectoryPicker" in window;

async function fileToSong(
	file: File,
	audioElement: HTMLAudioElement,
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
	const { stack, push } = useAddress();
	const fallbackInputRef = useRef<HTMLInputElement>(null);

	const handleSelectRoot = async () => {
		const handle = await showDirectoryPicker({ mode: "read" }).catch(
			() => null,
		);
		if (!handle) return;
		// Reset navigation to new root
		push(handle);
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
		handle.getFile().then((file) => fileToSong(file, audioElement));

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
			const handles = await collectFileHandles(files);
			console.log(`[Explorer] Loading ${handles.length} file(s)...`);

			const songs = (
				await Promise.all(handles.map((h) => queueFile(h)))
			).filter((s) => s !== undefined);

			if (!currentSong && songs.length > 0) {
				const [first, ...rest] = songs;
				setCurrentSong(first);
				setQueue((prev) => [...prev, ...rest]);
			} else {
				setQueue((prev) => [...prev, ...songs]);
			}
			setCurrentSrc("file");

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
					accept="audio/*"
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
		<Dialog>
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
