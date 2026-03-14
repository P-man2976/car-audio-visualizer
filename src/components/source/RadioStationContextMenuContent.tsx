import type { AreaChannels, ChannelNum } from "@/atoms/radio";
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
import { CHANNEL_NUMS } from "@/lib/radio-presets";

type Props = {
	stationId: string;
	type: RadioType;
	frequency: number | undefined;
	areaId: string | undefined;
	channelsByArea: Record<string, AreaChannels>;
	station?: FrequencyStation;
	onFrequencyChange?: (type: RadioType, frequency: number) => void;
	onAssignChannel: (ch: ChannelNum) => void;
};

export function RadioStationContextMenuContent({
	stationId,
	type,
	frequency,
	areaId,
	channelsByArea,
	station,
	onFrequencyChange,
	onAssignChannel,
}: Props) {
	return (
		<ContextMenuContent className="min-w-48">
			<ContextMenuSub>
				<ContextMenuSubTrigger>周波数</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					<ContextMenuRadioGroup
						value={frequency != null ? `${type}-${frequency}` : ""}
						onValueChange={(value) => {
							if (!onFrequencyChange) return;
							const [nextType, freq] = value.split("-") as [RadioType, string];
							onFrequencyChange(nextType, Number(freq));
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
							<ContextMenuItem key={ch} onClick={() => onAssignChannel(ch)}>
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
