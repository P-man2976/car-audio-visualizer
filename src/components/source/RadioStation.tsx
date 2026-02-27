import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useAtom, useAtomValue } from "jotai";
import { currentRadioAtom, customFrequencyAreaAtom, radioStationSizeAtom } from "../../atoms/radio";
import { currentSrcAtom, queueAtom } from "../../atoms/player";
import { audioElementAtom, audioMotionAnalyzerAtom } from "../../atoms/audio";
import { useRadioFrequencies } from "../../services/radio";
import type { RadikoStation, RadioType } from "../../types/radio";

export function RadioStation({ name, id, logo }: RadikoStation) {
	const [currentRadio, setCurrentRadio] = useAtom(currentRadioAtom);
	const [currentSrc, setCurrentSrc] = useAtom(currentSrcAtom);
	const size = useAtomValue(radioStationSizeAtom);
	const [queue, setQueue] = useAtom(queueAtom);
	const [customFreqList, setCustomFreqList] = useAtom(customFrequencyAreaAtom);
	const audioElement = useAtomValue(audioElementAtom);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);

	const { data: frequencies } = useRadioFrequencies();

	const station = frequencies?.[id];
	const customFreq = customFreqList.find((s) => s.id === id);
	const type: RadioType = customFreq?.type ?? station?.type ?? "FM";
	const frequency =
		customFreq?.freq ??
		(station
			? station.type === "AM"
				? station.frequencies_am.find((area) => area.primary)?.frequency
				: station.frequencies_fm.find((area) => area.primary)?.frequency
			: undefined);

	const isSelected = currentSrc === "radio" && currentRadio?.source === "radiko" && currentRadio.id === id;

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<Button
					variant="ghost"
					className={cn(
						"flex justify-start h-full gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-500/50 transition-all group",
						isSelected && "bg-gray-500/30 border"
					)}
					onClick={() => {
						// Safari: AudioContext と audioElement はユーザージェスチャー内で
						// アンロックする必要がある。非同期の M3U8 取得後に resume()/play() しても
						// ジェスチャーコンテキストが失効しているため、ここで先行してアンロックする。
						void audioMotionAnalyzer.audioCtx.resume();
						void audioElement.play().catch(() => undefined);
						setCurrentSrc("radio");
						setCurrentRadio({ type, source: "radiko", id, name, logo: logo?.[0], frequency });
						if (!queue.includes(name)) {
							setQueue((current) => [name, ...current].slice(0, 20));
						}
					}}
				>
					<div
						className={cn(
							"h-full grid place-content-center p-2 rounded-md shadow-md transition-all",
							size === "lg" && "w-24",
							isSelected
								? "bg-gray-300"
								: "bg-gray-500/50 group-hover:bg-gray-400/50"
						)}
					>
						{logo?.[0] ? (
							<img src={logo[0]} alt={name} />
						) : (
							<span>{name.slice(0, 2)}</span>
						)}
					</div>
					{size === "lg" ? (
						<div className="flex flex-col items-start">
							{frequency != null && (
								<span className="text-gray-300 text-sm">
									{frequency}{type === "AM" ? "kHz" : "MHz"}
								</span>
							)}
							<span className="text-lg">{name}</span>
						</div>
					) : null}
				</Button>
			</ContextMenuTrigger>
			<ContextMenuContent className="min-w-48">
				<ContextMenuSub>
					<ContextMenuSubTrigger>周波数</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<ContextMenuRadioGroup
							value={`${type}-${frequency}`}
							onValueChange={(area) => {
								const [newType, freq] = area.split("-") as [RadioType, string];
								setCustomFreqList((stations) =>
									stations.find((s) => s.id === id)
										? [
												...stations.filter((s) => s.id !== id),
												{ id, type: newType, freq: Number(freq) },
											]
										: [...stations, { id, type: newType, freq: Number(freq) }]
								);
								if (isSelected) {
									setCurrentRadio((prev) =>
										prev ? { ...prev, type: newType, frequency: Number(freq) } : prev
									);
								}
							}}
						>
							{station?.frequencies_fm?.map((area) => (
								<ContextMenuRadioItem
									key={area.area.toString()}
									value={`FM-${area.frequency}`}
								>
									{area.frequency}MHz ({area.area.join(", ")})
								</ContextMenuRadioItem>
							))}
							{station?.frequencies_am?.map((area) => (
								<ContextMenuRadioItem
									key={area.area.toString()}
									value={`AM-${area.frequency}`}
								>
									{area.frequency}kHz ({area.area.join(", ")})
								</ContextMenuRadioItem>
							))}
						</ContextMenuRadioGroup>
					</ContextMenuSubContent>
				</ContextMenuSub>
			</ContextMenuContent>
		</ContextMenu>
	);
}
