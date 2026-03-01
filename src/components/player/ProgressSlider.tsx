import { Slider } from "@/components/ui/slider";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { audioElementAtom } from "../../atoms/audio";
import {
	currentSongAtom,
	currentSrcAtom,
	progressAtom,
} from "../../atoms/player";
import {
	currentRadioAtom,
	radioChannelsByAreaAtom,
	tuningFreqAtom,
} from "../../atoms/radio";
import { displayStringAtom } from "../../atoms/display";
import { buildDisplayString } from "../../lib/display";
import { useRadikoArea } from "../../services/radiko";

function formatTime(seconds: number) {
	if (!Number.isFinite(seconds) || seconds < 0) {
		return "-:--";
	}

	const mm = Math.floor(seconds / 60)
		.toString()
		.padStart(1, "0");
	const ss = Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0");

	return `${mm}:${ss}`;
}

export function ProgressSlider() {
	const currentSrc = useAtomValue(currentSrcAtom);
	const audioElement = useAtomValue(audioElementAtom);
	const currentRadio = useAtomValue(currentRadioAtom);
	const currentSong = useAtomValue(currentSongAtom);
	const tuningFreq = useAtomValue(tuningFreqAtom);
	const channelsByArea = useAtomValue(radioChannelsByAreaAtom);
	const areaId = useRadikoArea();
	const [progress, setProgress] = useAtom(progressAtom);
	const setDisplayString = useSetAtom(displayStringAtom);

	// 現在周波数がどのチャンネルに設定されているかを導出（アニメーション中は null）
	const channelNum = useMemo(() => {
		if (!areaId || !currentRadio?.frequency || tuningFreq != null) return null;
		const areaChans = channelsByArea[areaId];
		if (!areaChans) return null;
		const bandKey = currentRadio.type === "FM" ? "fm" : "am";
		const bandChans = areaChans[bandKey];
		for (let i = 1; i <= 6; i++) {
			if (bandChans[i as 1]?.freq === currentRadio.frequency) return i;
		}
		return null;
	}, [areaId, currentRadio, tuningFreq, channelsByArea]);

	useEffect(() => {
		const progressInterval = setInterval(() => {
			if (currentSrc !== "off") {
				setProgress(audioElement.currentTime);
			}
		}, 200);

		return () => {
			clearInterval(progressInterval);
		};
	}, [currentSrc, audioElement, setProgress]);

	// Display string update — tuningFreq と channelNum を渡してドットマトリクスに反映
	useEffect(() => {
		setDisplayString(
			buildDisplayString(
				currentSrc,
				currentRadio,
				progress,
				currentSong,
				tuningFreq,
				channelNum,
			),
		);
	}, [
		currentSrc,
		currentRadio,
		progress,
		currentSong,
		tuningFreq,
		channelNum,
		setDisplayString,
	]);

	if (currentSrc === "off") {
		return (
			<div className="mb-4 h-2 w-full rounded-full bg-secondary shadow-lg" />
		);
	}

	if (currentSrc === "radio" || currentSrc === "aux") {
		return (
			<div className="relative mb-4 w-full">
				<div className="h-2 w-full rounded-full bg-secondary shadow-lg mask-[linear-gradient(to_right,black,rgba(0,0,0,60%),transparent,transparent,rgba(0,0,0,60%),black)]" />
				<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg">
					ＬＩＶＥ
				</span>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<Slider
				className="shadow-lg"
				aria-label="progress"
				min={0}
				max={audioElement.duration || 1}
				value={[progress]}
				onValueChange={(val) => {
					audioElement.currentTime = val[0] ?? 0;
				}}
			/>
			<div className="flex justify-between text-gray-400">
				<span>{formatTime(progress)}</span>
				<span>
					{audioElement.duration ? formatTime(audioElement.duration) : "-:--"}
				</span>
			</div>
		</div>
	);
}
