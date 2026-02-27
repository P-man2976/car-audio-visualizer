import { cn } from "@/lib/utils";
import { useAtom, useAtomValue } from "jotai";
import { currentRadioAtom } from "../../atoms/radio";
import { currentSrcAtom, queueAtom } from "../../atoms/player";
import { audioElementAtom, audioMotionAnalyzerAtom } from "../../atoms/audio";
import type { RadiruStation as RadiruStationType, RadioType } from "../../types/radio";

type RadiruChannel = {
	areajp: string;
	type: RadioType;
	label: string;
	name: string;
	url: string;
};

export function RadiruStation({ areajp, fmhls, r1hls, r2hls }: RadiruStationType) {
	const channels: RadiruChannel[] = [
		{ areajp, type: "AM", label: "第一", name: "ラジオ第一", url: r1hls },
		{ areajp, type: "AM", label: "第二", name: "ラジオ第二", url: r2hls },
		{ areajp, type: "FM", label: "ＦＭ", name: "NHK-FM", url: fmhls },
	];

	return (
		<div className="grid grid-cols-3 gap-2">
			{channels.map((channel) => (
				<RadiruChannelCard key={`${channel.name}-${channel.url}`} {...channel} />
			))}
		</div>
	);
}

function RadiruChannelCard({ areajp, type, label, name, url }: RadiruChannel) {
	const [currentRadio, setCurrentRadio] = useAtom(currentRadioAtom);
	const [currentSrc, setCurrentSrc] = useAtom(currentSrcAtom);
	const [queue, setQueue] = useAtom(queueAtom);
	const audioElement = useAtomValue(audioElementAtom);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const isSelected = currentSrc === "radio" && currentRadio?.source === "radiru" && currentRadio.url === url;

	return (
		<button
			type="button"
			className={cn(
				"flex flex-col p-2 items-center justify-center rounded-lg cursor-pointer hover:bg-gray-500/50 transition-all",
				isSelected && "bg-gray-500/30 border",
			)}
			onClick={() => {
				// Safari: AudioContext と audioElement はユーザージェスチャー内で
				// アンロックする必要がある。非同期の HLS 再生前にここで先行してアンロックする。
				void audioMotionAnalyzer.audioCtx.resume();
				void audioElement.play().catch(() => undefined);
				setCurrentSrc("radio");
				setCurrentRadio({ type, source: "radiru", url, name });
				if (!queue.includes(name)) {
					setQueue((current) => [name, ...current].slice(0, 20));
				}
			}}
		>
			<span className="text-gray-300 text-sm">{areajp}</span>
			<span className="text-2xl">{label}</span>
		</button>
	);
}
