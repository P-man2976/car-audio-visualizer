import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useMemo } from "react";
import {
	type ChannelNum,
	currentRadioAtom,
	customFrequencyAreaAtom,
	radioChannelsByAreaAtom,
	tuningFreqAtom,
} from "@/atoms/radio";
import { RadioStationContextMenuContent } from "@/components/source/RadioStationContextMenuContent";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSelectRadio } from "@/hooks/radio";
import { assignChannelPreset, CHANNEL_NUMS } from "@/lib/radio-presets";
import { useRadikoArea } from "@/services/radiko";
import { useRadioFrequencies } from "@/services/radio";
import type { RadioType } from "@/types/radio";

export function ChannelPresets() {
	const currentRadio = useAtomValue(currentRadioAtom);
	const setCurrentRadio = useSetAtom(currentRadioAtom);
	const [, setCustomFreqList] = useAtom(customFrequencyAreaAtom);
	const tuningFreq = useAtomValue(tuningFreqAtom);
	const [channelsByArea, setChannelsByArea] = useAtom(radioChannelsByAreaAtom);
	const areaId = useRadikoArea();
	const { data: frequencies } = useRadioFrequencies();
	const { selectRadio } = useSelectRadio();

	const bandKey = currentRadio?.type === "AM" ? "am" : "fm";
	const station =
		currentRadio?.source === "radiko"
			? frequencies?.[currentRadio.id]
			: undefined;

	const presets = useMemo(() => {
		if (!areaId) return {};
		const areaChans = channelsByArea[areaId];
		if (!areaChans) return {};
		return areaChans[bandKey];
	}, [areaId, channelsByArea, bandKey]);

	const activeChannel = useMemo(() => {
		if (!currentRadio?.frequency || tuningFreq != null) return null;
		for (const ch of CHANNEL_NUMS) {
			if (presets[ch]?.freq === currentRadio.frequency) return ch;
		}
		return null;
	}, [currentRadio, tuningFreq, presets]);

	const assignCurrentToChannel = (ch: ChannelNum) => {
		if (
			!areaId ||
			currentRadio?.source !== "radiko" ||
			currentRadio.frequency == null
		) {
			return;
		}
		const freq = currentRadio.frequency;
		setChannelsByArea((prev) => {
			const area = prev[areaId] ?? { fm: {}, am: {} };
			return {
				...prev,
				[areaId]: assignChannelPreset(area, bandKey, ch, {
					freq,
					type: currentRadio.type,
					stationId: currentRadio.id,
					stationName: currentRadio.name,
				}),
			};
		});
	};

	const handleClick = (ch: ChannelNum) => {
		const preset = presets[ch];
		if (preset) {
			selectRadio({
				id: preset.stationId,
				name: preset.stationName,
				type: preset.type,
				frequency: preset.freq,
				source: "radiko",
			});
			return;
		}
		assignCurrentToChannel(ch);
	};

	return (
		<div className="flex gap-1 sm:gap-1.5">
			{CHANNEL_NUMS.map((ch) => {
				const preset = presets[ch];
				const isActive = activeChannel === ch;
				return (
					<ContextMenu key={ch}>
						<Tooltip>
							<TooltipTrigger asChild>
								<ContextMenuTrigger asChild>
									<Button
										variant="ghost"
										className={`h-8 w-8 p-0 font-mono text-sm font-bold sm:size-10 sm:text-base md:size-12 md:text-lg ${
											preset
												? isActive
													? "bg-gray-500/30 border"
													: ""
												: "opacity-30"
										}`}
										onClick={() => handleClick(ch)}
										aria-label={
											preset
												? `CH${ch}: ${preset.stationName}`
												: `CH${ch}: 未登録（現在の局を登録）`
										}
									>
										{ch}
									</Button>
								</ContextMenuTrigger>
							</TooltipTrigger>
							<TooltipContent>
								{preset ? preset.stationName : "現在の局を登録"}
							</TooltipContent>
						</Tooltip>
						<RadioStationContextMenuContent
							stationId={
								currentRadio?.source === "radiko" ? currentRadio.id : ""
							}
							type={currentRadio?.type ?? "FM"}
							frequency={currentRadio?.frequency}
							areaId={areaId}
							channelsByArea={channelsByArea}
							station={station}
							onFrequencyChange={(nextType: RadioType, freq) => {
								if (currentRadio?.source !== "radiko") return;
								const id = currentRadio.id;
								setCustomFreqList((stations) =>
									stations.find((s) => s.id === id)
										? [
												...stations.filter((s) => s.id !== id),
												{ id, type: nextType, freq },
											]
										: [...stations, { id, type: nextType, freq }],
								);
								setCurrentRadio((prev) => {
									if (!prev || prev.source !== "radiko" || prev.id !== id)
										return prev;
									return { ...prev, type: nextType, frequency: freq };
								});
							}}
							onAssignChannel={assignCurrentToChannel}
						/>
					</ContextMenu>
				);
			})}
		</div>
	);
}
