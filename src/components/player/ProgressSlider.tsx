import { Slider } from "@/components/ui/slider";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { audioElementAtom } from "../../atoms/audio";
import { currentSrcAtom, progressAtom } from "../../atoms/player";

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
	const [progress, setProgress] = useAtom(progressAtom);

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

	if (currentSrc === "off") {
		return (
			<div className="relative mb-4 w-full">
				<div className="h-2 w-full rounded-full bg-secondary shadow-lg" />
				<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg">ＡＬＬ　ＯＦＦ</span>
			</div>
		);
	}

	if (currentSrc === "radio" || currentSrc === "aux") {
		return (
			<div className="relative mb-4 w-full">
				<div className="h-2 w-full rounded-full bg-secondary shadow-lg [mask-image:linear-gradient(to_right,_black,_rgba(0,0,0,60%),_transparent,_transparent,_rgba(0,0,0,60%),_black)]" />
				<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg">ＬＩＶＥ</span>
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
				<span>{audioElement.duration ? formatTime(audioElement.duration) : "-:--"}</span>
			</div>
		</div>
	);
}
