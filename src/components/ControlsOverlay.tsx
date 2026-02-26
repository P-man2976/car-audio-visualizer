import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
			setDisplayString("ALL OFF".padEnd(12, " "));
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
	}, [audioElement, currentSrc, currentRadio, load, mutate, queue, setDisplayString, setIsPlaying, setQueue, unLoad]);

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
			<div className="group relative flex flex-col justify-center">
				<div className="absolute inset-0 bg-gradient-to-b from-gray-600/50 to-transparent opacity-50 transition-all duration-500 group-hover:opacity-100" />
				<div className="z-10 flex w-full items-center justify-between px-2 py-1">
					<span className="truncate text-sm">
						{currentSrc === "off" ? "ALL OFF" : `${currentRadio?.name ?? "局未選択"}`}
					</span>
					<Badge variant={currentSrc === "off" ? "secondary" : "success"}>
						{currentSrc === "off" ? "OFF" : "ON AIR"}
					</Badge>
				</div>
				<SourceSheet>
					<Button className="z-10 w-full" variant="ghost">
						▼
					</Button>
				</SourceSheet>
			</div>
			<div className="flex h-full items-center justify-between">
				<MenuSheet>
					<Button variant="secondary" size="icon">
						<ChevronRight className="scale-y-150" />
					</Button>
				</MenuSheet>
				<QueueSheet>
					<Button variant="secondary" size="icon">
						<ChevronLeft className="scale-y-150" />
					</Button>
				</QueueSheet>
			</div>
			<div className="bg-gradient-to-t from-gray-500/50 to-transparent px-12 pb-8 pt-16">
				<div className="grid gap-4">
					<ProgressSlider />
					<div className="flex items-center gap-8">
						<Avatar size="lg">
							{currentRadio?.logo ? <AvatarImage src={currentRadio.logo} /> : <AvatarFallback>AV</AvatarFallback>}
						</Avatar>
						<SongInfo
							title={title}
							artist={currentSrc === "radio" ? (currentRadio?.type === "AM" ? "AM Band" : "FM Band") : ""}
							album={currentSrc === "radio" ? (currentRadio?.source === "radiko" ? "Radiko" : "NHKラジオ らじる★らじる") : ""}
						/>
						<div className="flex items-center gap-2">
						<Button onClick={() => void onPlay()}>再生</Button>
						<Button variant="secondary" onClick={onPause}>一時停止</Button>
						<Button variant="ghost" onClick={onStop}>停止</Button>
					<Badge variant={isPlaying ? "success" : "secondary"}>
							{isPlaying ? "PLAY" : "STOP"}
						</Badge>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
