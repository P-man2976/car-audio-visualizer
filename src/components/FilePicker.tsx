import { parseBlob } from "music-metadata";
import { Button } from "./ui/button";
import { useAtom, useSetAtom } from "jotai";
import { useRef } from "react";
import { currentSongAtom, currentSrcAtom, songQueueAtom } from "@/atoms/player";
import { displayStringAtom } from "@/atoms/display";
import { StepBack } from "lucide-react";
import type { Song } from "@/types/player";

/** showOpenFilePicker が使えるかどうか */
const hasFSA = "showOpenFilePicker" in window;

async function fileToSong(file: File): Promise<Song> {
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
					new Blob([new Uint8Array(picture[0].data)], { type: picture[0].format }),
				)
			: undefined,
	};
}

export function FilePicker() {
	const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
	const setQueue = useSetAtom(songQueueAtom);
	const setDisplayString = useSetAtom(displayStringAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);
	const inputRef = useRef<HTMLInputElement>(null);

	const loadSongs = async (files: File[]) => {
		if (!files.length) return;
		setDisplayString("CD-01   LOAD");
		const songs = await Promise.all(files.map(fileToSong));
		if (currentSong) {
			setQueue((prev) => [...prev, ...songs]);
		} else {
			const [current, ...queue] = songs;
			setCurrentSong(current);
			setQueue(queue);
		}
		setCurrentSrc("file");
	};

	const handleClick = async () => {
		if (hasFSA) {
			// File System Access API 対応ブラウザ: showOpenFilePicker を使用
			const handles = await showOpenFilePicker({
				multiple: true,
				excludeAcceptAllOption: false,
				types: [{ description: "Audio", accept: { "audio/*": [] } }],
			}).catch(() => null);
			if (!handles?.length) return;
			const files = await Promise.all(handles.map((h) => h.getFile()));
			await loadSongs(files);
		} else {
			// フォールバック: 隠し input[type=file] を使用
			inputRef.current?.click();
		}
	};

	return (
		<>
			{!hasFSA && (
				<input
					ref={inputRef}
					type="file"
					multiple
					accept="audio/*"
					className="sr-only"
					onChange={async (e) => {
						const files = Array.from(e.target.files ?? []);
						await loadSongs(files);
						// 同じファイルを再選択できるようリセット
						e.target.value = "";
					}}
				/>
			)}
			<Button className="w-full gap-4" onClick={handleClick}>
				<StepBack className="rotate-90" fill="white" />
				ファイルポップアップから読み込み
			</Button>
		</>
	);
}
