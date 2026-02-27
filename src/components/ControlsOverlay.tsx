import { Button } from "@/components/ui/button";
import { useAtom, useAtomValue } from "jotai";
import { ChevronDown, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, LogIn, Pause, Play, RadioTower, Square } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { audioElementAtom } from "../atoms/audio";
import { currentSongAtom, currentSrcAtom, queueAtom, volumeAtom } from "../atoms/player";
import { currentRadioAtom } from "../atoms/radio";
import { useHLS } from "../hooks/hls";
import { usePlayer } from "../hooks/player";
import { useRadikoM3u8Url } from "../services/radiko";
import { MenuSheet } from "./MenuSheet";
import { QueueSheet } from "./QueueSheet";
import { ProgressSlider } from "./player/ProgressSlider";
import { SongInfo } from "./player/SongInfo";
import { SourceSheet } from "./SourceSheet";

export function ControlsOverlay() {
	const audioElement = useAtomValue(audioElementAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const currentRadio = useAtomValue(currentRadioAtom);
	const currentSong = useAtomValue(currentSongAtom);
	const volume = useAtomValue(volumeAtom);
	const [queue, setQueue] = useAtom(queueAtom);
	const { isPlaying, play, pause, stop, next, prev } = usePlayer();
	const { load, unLoad } = useHLS();
	const { mutate } = useRadikoM3u8Url();

	/** Set to true just before next() so the src effect auto-plays the incoming song */
	const autoPlayNextRef = useRef(false);

	useEffect(() => {
		audioElement.crossOrigin = "anonymous";
		audioElement.volume = volume / 100;
	}, [audioElement, volume]);

	// File mode: set audio src when song changes; auto-play if advancing from onEnded
	useEffect(() => {
		if (currentSrc !== "file" || !currentSong) return;
		audioElement.src = currentSong.url;
		audioElement.load();
		if (autoPlayNextRef.current) {
			autoPlayNextRef.current = false;
			play().catch(console.error);
		}
	}, [audioElement, currentSrc, currentSong, play]);

	// File mode: auto-advance at track end
	useEffect(() => {
		const onEnded = () => {
			if (currentSrc === "file") {
				autoPlayNextRef.current = true;
				next();
			}
		};
		audioElement.addEventListener("ended", onEnded);
		return () => audioElement.removeEventListener("ended", onEnded);
	}, [audioElement, currentSrc, next]);

	// Radio mode: HLS load/unload; off mode: stop
	useEffect(() => {
		if (currentSrc === "off") {
			unLoad();
			audioElement.pause();
			return;
		}

		if (currentSrc === "radio" && currentRadio) {
			if (currentRadio.source === "radiko") {
				mutate(currentRadio.id, {
					onSuccess: (m3u8) => load(m3u8),
				});
			} else if (currentRadio.source === "radiru") {
				load(currentRadio.url);
			}

			if (!queue.includes(currentRadio.name)) {
				setQueue((current) => [currentRadio.name, ...current].slice(0, 20));
			}
		}

		return () => {
			unLoad();
		};
	}, [currentSrc, currentRadio, audioElement, load, unLoad, mutate, queue, setQueue]);

	// Dot matrix display string is updated in ProgressSlider to avoid re-renders here

	const title = useMemo(() => {
		switch (currentSrc) {
			case "file":
				return currentSong?.title ?? currentSong?.filename ?? "タイトル不明";
			case "radio":
				return currentRadio?.name ?? "局未選択";
			case "aux":
				return "外部入力";
			case "off":
				return "ALL OFF";
		}
	}, [currentSrc, currentSong, currentRadio]);

	const artist = useMemo(() => {
		if (currentSrc === "file") return currentSong?.artists?.join(", ");
		if (currentSrc === "radio") {
			return currentRadio?.frequency
				? currentRadio.type === "AM"
					? `${currentRadio.frequency}kHz`
					: `${currentRadio.frequency.toFixed(1)}MHz`
				: undefined;
		}
		return undefined;
	}, [currentSrc, currentSong, currentRadio]);

	const album = useMemo(() => {
		if (currentSrc === "file") return currentSong?.album;
		if (currentSrc === "radio") {
			return currentRadio?.source === "radiko" ? "Radiko" : "NHKラジオ らじる★らじる";
		}
		return undefined;
	}, [currentSrc, currentSong, currentRadio]);

	const coverSrc = currentSrc === "file" ? currentSong?.artwork : undefined;

	return (
		<div className="absolute inset-0 flex w-full flex-col gap-2">
			{/* Header */}
			<div className="group relative flex flex-col justify-center">
				<div className="absolute inset-0 bg-linear-to-b from-gray-600/50 to-transparent opacity-50 transition-all duration-500 group-hover:opacity-100" />
				<div className="z-10 flex w-full items-center px-2 py-1">
					<span className="truncate text-sm">{title}</span>
				</div>
				<SourceSheet>
					<Button variant={null} className="z-10 w-full">
						<ChevronDown className="scale-x-150" />
					</Button>
				</SourceSheet>
			</div>
			{/* Sidebar */}
			<div className="flex h-full items-center justify-between">
				<MenuSheet>
					<Button
						variant={null}
						className="h-full group/btn relative pr-12"
					>
						<div className="absolute inset-0 opacity-0 from-gray-600/50 bg-[radial-gradient(80%_60%_at_left,var(--tw-gradient-from),transparent)] transition-all duration-500 group-hover/btn:opacity-100" />
						<ChevronRight className="scale-y-150" />
					</Button>
				</MenuSheet>
				<QueueSheet>
					<Button
						variant={null}
						className="h-full group/btn relative pl-12"
					>
						<div className="absolute inset-0 opacity-0 from-gray-600/50 bg-[radial-gradient(80%_60%_at_right,var(--tw-gradient-from),transparent)] transition-all duration-500 group-hover/btn:opacity-100" />
						<ChevronLeft className="scale-y-150" />
					</Button>
				</QueueSheet>
			</div>
			{/* Footer */}
			<div className="flex flex-col gap-4 bg-linear-to-t from-gray-500/50 to-transparent px-12 pb-8 pt-16">
				<ProgressSlider />
				<div className="flex items-center gap-8">
					{/* Cover image / icon */}
					<div className="size-20 shrink-0 rounded-md shadow-lg overflow-hidden bg-gray-500/50 grid place-content-center text-2xl">
						{coverSrc ? (
							<img src={coverSrc} alt="cover" className="size-full object-cover" />
						) : currentSrc === "radio" ? (
							<RadioTower />
						) : currentSrc === "aux" ? (
							<LogIn />
						) : null}
					</div>
					<SongInfo title={title} artist={artist} album={album} />
					{/* Control buttons */}
					<div className="ml-auto flex shrink-0 gap-2">
						{currentSrc === "file" && (
							<Button size="icon-lg" variant="ghost" className="p-2" onClick={prev}>
								<ChevronFirst />
							</Button>
						)}
						<Button
							size="icon-lg"
							variant="ghost"
							className="p-2"
							onClick={async () => (isPlaying ? pause() : await play())}
						>
							{isPlaying ? <Pause /> : <Play />}
						</Button>
						{currentSrc === "file" && (
							<Button size="icon-lg" variant="ghost" className="p-2" onClick={next}>
								<ChevronLast />
							</Button>
						)}
						<Button size="icon-lg" variant="ghost" className="p-2" onClick={stop}>
							<Square />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
