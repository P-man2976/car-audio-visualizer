import { useAtom, useAtomValue } from "jotai";
import { useMemo } from "react";
import {
	type ChannelNum,
	type ChannelPreset,
	currentRadioAtom,
	radioChannelsByAreaAtom,
	tuningFreqAtom,
} from "@/atoms/radio";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSelectRadio } from "@/hooks/radio";
import { useRadikoArea } from "@/services/radiko";

const CHANNELS: ChannelNum[] = [1, 2, 3, 4, 5, 6];

export function ChannelPresets() {
	const currentRadio = useAtomValue(currentRadioAtom);
	const tuningFreq = useAtomValue(tuningFreqAtom);
	const [channelsByArea, setChannelsByArea] = useAtom(radioChannelsByAreaAtom);
	const areaId = useRadikoArea();
	const { selectRadio } = useSelectRadio();

	const bandKey = currentRadio?.type === "AM" ? "am" : "fm";

	const presets = useMemo(() => {
		if (!areaId) return {};
		const areaChans = channelsByArea[areaId];
		if (!areaChans) return {};
		return areaChans[bandKey];
	}, [areaId, channelsByArea, bandKey]);

	const activeChannel = useMemo(() => {
		if (!currentRadio?.frequency || tuningFreq != null) return null;
		for (const ch of CHANNELS) {
			if (presets[ch]?.freq === currentRadio.frequency) return ch;
		}
		return null;
	}, [currentRadio, tuningFreq, presets]);

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
		} else if (
			areaId &&
			currentRadio?.source === "radiko" &&
			currentRadio.frequency != null
		) {
			const freq = currentRadio.frequency;
			setChannelsByArea((prev) => {
				const area = prev[areaId] ?? { fm: {}, am: {} };
				return {
					...prev,
					[areaId]: {
						...area,
						[bandKey]: {
							...area[bandKey],
							[ch]: {
								freq,
								type: currentRadio.type,
								stationId: currentRadio.id,
								stationName: currentRadio.name,
							} satisfies ChannelPreset,
						},
					},
				};
			});
		}
	};

	return (
		<div className="flex gap-1">
			{CHANNELS.map((ch) => {
				const preset = presets[ch];
				const isActive = activeChannel === ch;
				return (
					<Tooltip key={ch}>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								className={`h-8 w-8 p-0 font-mono text-sm font-bold ${
									preset
										? isActive
											? "ring-1 ring-neutral-400"
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
						</TooltipTrigger>
						<TooltipContent>
							{preset ? preset.stationName : "現在の局を登録"}
						</TooltipContent>
					</Tooltip>
				);
			})}
		</div>
	);
}
