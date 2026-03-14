import { useAtom, useAtomValue } from "jotai";
import { useMemo } from "react";
import { currentSrcAtom } from "@/atoms/player";
import {
	type ChannelNum,
	currentRadioAtom,
	customFrequencyAreaAtom,
	radioChannelsByAreaAtom,
	radioStationSizeAtom,
} from "@/atoms/radio";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useSelectRadio } from "@/hooks/radio";
import { assignChannelPreset, CHANNEL_NUMS } from "@/lib/radio-presets";
import { cn } from "@/lib/utils";
import { useRadikoArea } from "@/services/radiko";
import { useRadioFrequencies } from "@/services/radio";
import type { RadikoStation, RadioType } from "@/types/radio";
import { RadioStationContextMenuContent } from "./RadioStationContextMenuContent";

export function RadioStation({ name, id, logo }: RadikoStation) {
	const [currentRadio, setCurrentRadio] = useAtom(currentRadioAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const size = useAtomValue(radioStationSizeAtom);
	const [customFreqList, setCustomFreqList] = useAtom(customFrequencyAreaAtom);
	const [channelsByArea, setChannelsByArea] = useAtom(radioChannelsByAreaAtom);
	const areaId = useRadikoArea();
	const { selectRadio } = useSelectRadio();

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

	const isSelected =
		currentSrc === "radio" &&
		currentRadio?.source === "radiko" &&
		currentRadio.id === id;

	const stationChannels = useMemo(() => {
		if (!areaId) return [];
		const areaChans = channelsByArea[areaId];
		if (!areaChans) return [];
		const result: { band: string; ch: number }[] = [];
		for (const ch of CHANNEL_NUMS) {
			if (areaChans.fm[ch]?.stationId === id) result.push({ band: "F", ch });
			if (areaChans.am[ch]?.stationId === id) result.push({ band: "A", ch });
		}
		return result;
	}, [areaId, channelsByArea, id]);

	const assignChannel = (ch: ChannelNum) => {
		if (!areaId || frequency == null) return;
		setChannelsByArea((prev) => {
			const area = prev[areaId] ?? { fm: {}, am: {} };
			const bandKey = type === "AM" ? "am" : "fm";
			return {
				...prev,
				[areaId]: assignChannelPreset(area, bandKey, ch, {
					freq: frequency,
					type,
					stationId: id,
					stationName: name,
				}),
			};
		});
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<Button
					variant="ghost"
					className={cn(
						"flex justify-start h-full gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-500/50 transition-all group",
						isSelected && "bg-gray-500/30 border",
					)}
					onClick={() => {
						selectRadio({
							type,
							source: "radiko",
							id,
							name,
							logo: logo?.[0],
							frequency,
						});
					}}
				>
					<div
						className={cn(
							"h-full grid place-content-center p-2 rounded-md shadow-md transition-all",
							size === "lg" && "w-24",
							isSelected
								? "bg-gray-300"
								: "bg-gray-500/50 group-hover:bg-gray-400/50",
						)}
					>
						{logo?.[0] ? (
							<img src={logo[0]} alt={name} />
						) : (
							<span>{name.slice(0, 2)}</span>
						)}
					</div>
					{size === "lg" ? (
						<>
							<div className="flex flex-col items-start">
								{frequency != null && (
									<span className="text-gray-300 text-sm">
										{frequency.toFixed(type === "AM" ? 0 : 1)}
										{type === "AM" ? "kHz" : "MHz"}
									</span>
								)}
								<span className="text-lg">{name}</span>
							</div>
							{stationChannels.length > 0 && (
								<div className="ml-auto flex gap-1 items-center">
									{stationChannels.map(({ band, ch }) => (
										<span
											key={`${band}${ch}`}
											className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-500/60 text-neutral-200"
										>
											{band}
											{ch}
										</span>
									))}
								</div>
							)}
						</>
					) : null}
				</Button>
			</ContextMenuTrigger>
			<RadioStationContextMenuContent
				stationId={id}
				type={type}
				frequency={frequency}
				areaId={areaId}
				channelsByArea={channelsByArea}
				station={station}
				onFrequencyChange={(newType, freq) => {
					setCustomFreqList((stations) =>
						stations.find((s) => s.id === id)
							? [
									...stations.filter((s) => s.id !== id),
									{ id, type: newType, freq },
								]
							: [...stations, { id, type: newType, freq }],
					);
					if (isSelected) {
						setCurrentRadio((prev) =>
							prev ? { ...prev, type: newType, frequency: freq } : prev,
						);
					}
				}}
				onAssignChannel={assignChannel}
			/>
		</ContextMenu>
	);
}
