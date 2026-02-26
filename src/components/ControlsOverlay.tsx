import { Button } from "@/components/ui/button";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ChevronDown, ChevronLeft, ChevronRight, LogIn, Pause, Play, RadioTower, Square } from "lucide-react";
import { useEffect, useMemo } from "react";
import { audioElementAtom } from "../atoms/audio";
import { isPlayingAtom, progressAtom, volumeAtom, currentSrcAtom, queueAtom } from "../atoms/player";
import { currentRadioAtom } from "../atoms/radio";
import { displayStringAtom } from "../atoms/display";
import { buildDisplayString } from "../lib/display";
import { useHLS } from "../hooks/hls";
import { useRadikoM3u8Url } from "../services/radiko";
import { MenuSheet } from "./MenuSheet";
import { QueueSheet } from "./QueueSheet";
import { ProgressSlider } from "./player/ProgressSlider";
import { SongInfo } from "./player/SongInfo";
import { SourceSheet } from "./SourceSheet";

export function ControlsOverlay() {
	const audioElement = useAtomValue(audioElementAtom);
	const setDisplayString = useSetAtom(displayStringAtom);
	const [currentSrc, setCurrentSrc] = useAtom(currentSrcAtom);
	const currentRadio = useAtomValue(currentRadioAtom);
	const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
	const volume = useAtomValue(volumeAtom);
	const progress = useAtomValue(progressAtom);
	const [queue, setQueue] = useAtom(queueAtom);
	const { load, unLoad } = useHLS();
	const { mutate } = useRadikoM3u8Url();

	useEffect(() => {
		audioElement.crossOrigin = "anonymous";
		audioElement.volume = volume / 100;
	}, [audioElement, volume]);

	useEffect(() => {
		const onEnded = () => {
			setIsPlaying(false);
		};

		audioElement.addEventListener("ended", onEnded);

		return () => {
			audioElement.removeEventListener("ended", onEnded);
		};
	}, [audioElement, setIsPlaying]);

	useEffect(() => {
		if (currentSrc === "off") {
			unLoad();
			audioElement.pause();
			setIsPlaying(false);
			return;
		}

		if (currentSrc === "radio" && currentRadio) {
			if (currentRadio.source === "radiko") {
				mutate(currentRadio.id, {
					onSuccess: (m3u8) => {
						load(m3u8);
						setIsPlaying(true);
					},
				});
			} else if (currentRadio.source === "radiru") {
				load(currentRadio.url);
				setIsPlaying(true);
			}

			if (!queue.includes(currentRadio.name)) {
				setQueue((current) => [currentRadio.name, ...current].slice(0, 20));
			}
		}

		return () => {
			unLoad();
		};
	}, [audioElement, currentSrc, currentRadio, load, mutate, queue, setIsPlaying, setQueue, unLoad]);

	useEffect(() => {
		setDisplayString(buildDisplayString(currentSrc, currentRadio, progress));
	}, [currentSrc, currentRadio, progress, setDisplayString]);

	const title = useMemo(() => {
		if (currentSrc === "off") {
			return "ALL OFF";
		}

		if (currentSrc === "radio") {
			return currentRadio?.name ?? "局未選択";
		}

		return "外部入力";
	}, [currentSrc, currentRadio]);

	const onPlay = async () => {
		if (currentSrc === "off") {
			return;
		}

		try {
			await audioElement.play();
			setIsPlaying(true);
		} catch {
			setIsPlaying(false);
		}
	};

	const onPause = () => {
		audioElement.pause();
		setIsPlaying(false);
	};

	const onStop = () => {
		audioElement.pause();
		audioElement.currentTime = 0;
		setIsPlaying(false);
		setCurrentSrc("off");
	};

	return (
		<div className="absolute inset-0 flex w-full flex-col gap-2">
			{/* Header */}
			<div className="group relative flex flex-col justify-center">
				<div className="absolute inset-0 bg-linear-to-b from-gray-600/50 to-transparent opacity-50 transition-all duration-500 group-hover:opacity-100" />
				<div className="z-10 flex w-full items-center px-2 py-1">
					<span className="truncate text-sm">
						{currentSrc === "off" ? "ALL OFF" : `${currentRadio?.name ?? "局未選択"}`}
					</span>
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
					{/* Cover image */}
					<div className="size-20 shrink-0 text-2xl rounded-md shadow-lg grid place-content-center bg-gray-500/50">
						{currentSrc === "radio" ? (
							<RadioTower />
						) : currentSrc === "aux" ? (
							<LogIn />
						) : null}
					</div>
					<SongInfo
						title={title}
						artist={currentSrc === "radio" ? (currentRadio?.type === "AM" ? "AM Band" : "FM Band") : ""}
						album={currentSrc === "radio" ? (currentRadio?.source === "radiko" ? "Radiko" : "NHKラジオ らじる★らじる") : ""}
					/>
					{/* Control buttons */}
					<div className="ml-auto flex shrink-0 gap-4">
						<Button
							size="icon-lg"
							variant="ghost"
							className="p-2 text-white text-4xl"
							onClick={async () => isPlaying ? onPause() : await onPlay()}
						>
							{isPlaying ? <Pause /> : <Play />}
						</Button>
						<Button
							size="icon-lg"
							variant="ghost"
							className="p-2 text-white text-2xl"
							onClick={onStop}
						>
							<Square />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
