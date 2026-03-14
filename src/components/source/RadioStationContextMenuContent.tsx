import { useAtom, useSetAtom } from "jotai";
import type { ChannelNum } from "@/atoms/radio";
import {
	currentRadioAtom,
	customFrequencyAreaAtom,
	radioChannelsByAreaAtom,
} from "@/atoms/radio";
import type { RadioType, FrequencyStation } from "@/types/radio";
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { assignChannelPreset, CHANNEL_NUMS } from "@/lib/radio-presets";
import { useRadikoArea } from "@/services/radiko";

type Props = {
	stationId: string;
	stationName: string;
	type: RadioType;
	frequency: number | undefined;
	station?: FrequencyStation;
};

export function RadioStationContextMenuContent({
	stationId,
	stationName,
	type,
	frequency,
	station,
}: Props) {
	const [channelsByArea, setChannelsByArea] = useAtom(radioChannelsByAreaAtom);
	const setCustomFreqList = useSetAtom(customFrequencyAreaAtom);
	const setCurrentRadio = useSetAtom(currentRadioAtom);
	const areaId = useRadikoArea();

	const handleFrequencyChange = (nextType: RadioType, freq: number) => {
		setCustomFreqList((stations) =>
			stations.find((s) => s.id === stationId)
				? [
						...stations.filter((s) => s.id !== stationId),
						{ id: stationId, type: nextType, freq },
					]
				: [...stations, { id: stationId, type: nextType, freq }],
		);
		setCurrentRadio((prev) => {
			if (!prev || prev.source !== "radiko" || prev.id !== stationId)
				return prev;
			return { ...prev, type: nextType, frequency: freq };
		});
	};

	const handleAssignChannel = (ch: ChannelNum) => {
		if (!areaId || frequency == null) return;
		setChannelsByArea((prev) => {
			const area = prev[areaId] ?? { fm: {}, am: {} };
			const bandKey = type === "AM" ? "am" : "fm";
			return {
				...prev,
				[areaId]: assignChannelPreset(area, bandKey, ch, {
					freq: frequency,
					type,
					stationId,
					stationName,
				}),
			};
		});
	};

	return (
		<ContextMenuContent className="min-w-48">
			<ContextMenuSub>
				<ContextMenuSubTrigger>周波数</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					<ContextMenuRadioGroup
						value={frequency != null ? `${type}-${frequency}` : ""}
						onValueChange={(value) => {
							const [nextType, freq] = value.split("-") as [RadioType, string];
							handleFrequencyChange(nextType, Number(freq));
						}}
					>
						{station?.frequencies_fm?.map((area) => (
							<ContextMenuRadioItem
								key={area.area.toString()}
								value={`FM-${area.frequency}`}
							>
								{area.frequency.toFixed(1)}MHz ({area.area.join(", ")})
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
			<ContextMenuSeparator />
			<ContextMenuSub>
				<ContextMenuSubTrigger>チャンネル設定</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					{CHANNEL_NUMS.map((ch) => {
						const bandKey = type === "AM" ? "am" : "fm";
						const existing = areaId
							? channelsByArea[areaId]?.[bandKey]?.[ch]
							: undefined;
						const isSelf = existing?.stationId === stationId;
						return (
							<ContextMenuItem key={ch} onClick={() => handleAssignChannel(ch)}>
								<span
									className={isSelf ? "text-neutral-100 font-semibold" : ""}
								>
									CH{ch}
								</span>
								{existing && !isSelf && (
									<span className="ml-auto max-w-24 truncate text-xs text-muted-foreground">
										{existing.stationName}
									</span>
								)}
								{isSelf && (
									<span className="ml-auto text-xs text-neutral-400">✓</span>
								)}
							</ContextMenuItem>
						);
					})}
				</ContextMenuSubContent>
			</ContextMenuSub>
		</ContextMenuContent>
	);
}
