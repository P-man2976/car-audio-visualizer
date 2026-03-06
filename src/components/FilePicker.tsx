import { useAtom, useSetAtom } from "jotai";
import { StepBack } from "lucide-react";
import { parseBlob } from "music-metadata";
import { useRef } from "react";
import { displayStringAtom } from "@/atoms/display";
import { currentSongAtom, currentSrcAtom, songQueueAtom } from "@/atoms/player";
import type { Song } from "@/types/player";
import { Button } from "./ui/button";

/** showOpenFilePicker が使えるかどうか */
const hasFSA = "showOpenFilePicker" in window;

async function fileToSong(
	file: File,
	handle?: FileSystemFileHandle,
): Promise<Song> {
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

export function FilePicker() {
	const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
	const setQueue = useSetAtom(songQueueAtom);
	const setDisplayString = useSetAtom(displayStringAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);
	const inputRef = useRef<HTMLInputElement>(null);

	const loadSongs = async (songs: Song[]) => {
		if (!songs.length) return;
		setDisplayString("CD-01   LOAD");
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
				types: [
					{
						description: "Audio",
						accept: {
							"audio/*": [
								".mp3",
								".m4a",
								".aac",
								".wav",
								".ogg",
								".flac",
								".opus",
								".webm",
								".aiff",
								".aif",
							],
						},
					},
				],
			}).catch(() => null);
			if (!handles?.length) return;
			const songs = await Promise.all(
				handles.map((h) => h.getFile().then((f) => fileToSong(f, h))),
			);
			await loadSongs(songs);
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
					accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.webm,.aiff,.aif"
					className="sr-only"
					onChange={async (e) => {
						const files = Array.from(e.target.files ?? []);
						// File[] → Song[] へ変換（fileToSong で blob URL 生成 + メタデータ解析）
						// FSA 非対応環境（iOS Safari 等）ではこのフォールバックパスが使われる
						const songs = await Promise.all(files.map((f) => fileToSong(f)));
						await loadSongs(songs);
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
