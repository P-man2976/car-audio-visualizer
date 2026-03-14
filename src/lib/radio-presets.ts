import type { AreaChannels, ChannelNum, ChannelPreset } from "@/atoms/radio";

export const CHANNEL_NUMS: ChannelNum[] = [1, 2, 3, 4, 5, 6];

export type PresetBandKey = "fm" | "am";

/**
 * Assign a channel preset while ensuring the same station is not duplicated
 * on another channel in the same band.
 */
export function assignChannelPreset(
	area: AreaChannels,
	bandKey: PresetBandKey,
	channel: ChannelNum,
	preset: ChannelPreset,
): AreaChannels {
	const band = { ...area[bandKey] };
	for (const ch of CHANNEL_NUMS) {
		if (ch !== channel && band[ch]?.stationId === preset.stationId) {
			delete band[ch];
		}
	}
	band[channel] = preset;
	return {
		...area,
		[bandKey]: band,
	};
}
