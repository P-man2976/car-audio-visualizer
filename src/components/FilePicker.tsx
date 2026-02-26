import { parseBlob } from "music-metadata-browser";
import { Button } from "./ui/button";
import { useAtom, useSetAtom } from "jotai";
import { currentSongAtom, currentSrcAtom, songQueueAtom } from "@/atoms/player";
import { displayStringAtom } from "@/atoms/display";
import { StepBack } from "lucide-react";

export function FilePicker() {
	const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
	const setQueue = useSetAtom(songQueueAtom);
	const setDisplayString = useSetAtom(displayStringAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);

	return (
		<Button
			className="p-4 w-full h-full max-w-3xl gap-4"
			onClick={async () => {
				const handles = await showOpenFilePicker({
					multiple: true,
					excludeAcceptAllOption: false,
					types: [
						{
							description: "Audio",
							accept: { "audio/*": [] },
						},
					],
				}).catch(() => null);

				if (!handles?.length) return;

				setDisplayString("CD-01   LOAD");

				const songs = await Promise.all(
					handles.map(async (handle) => {
						const file = await handle.getFile();
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
					}),
				);

				if (currentSong) {
					setQueue((prev) => [...prev, ...songs]);
				} else {
					const [current, ...queue] = songs;
					setCurrentSong(current);
					setQueue(queue);
				}
				setCurrentSrc("file");

				console.log("load finished", songs);
			}}
		>
			<StepBack className="rotate-90" fill="white" />
			ファイルポップアップから読み込み
		</Button>
	);
}
