import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { Radio, RadioType } from "@/types/radio";

export const currentRadioAtom = atomWithStorage<Radio | null>(
	"cav-current-radio-v2",
	null,
);
export const favoriteRadioAtom = atom<Radio[]>([]);
export const radioStationSizeAtom = atom<"sm" | "lg">("lg");
export const customFrequencyAreaAtom = atom<
	{ id: string; type: RadioType; freq: number }[]
>([]);
/** 選局アニメーション中に表示する周波数。null = アニメーションなし */
export const tuningFreqAtom = atom<number | null>(null);

export type ChannelNum = 1 | 2 | 3 | 4 | 5 | 6;

export type ChannelPreset = {
	freq: number;
	type: RadioType;
	stationId: string;
	stationName: string;
};

export type AreaChannels = {
	fm: Partial<Record<ChannelNum, ChannelPreset>>;
	am: Partial<Record<ChannelNum, ChannelPreset>>;
};

/** チャンネルプリセット（エリアごとに保存） */
export const radioChannelsByAreaAtom = atomWithStorage<
	Record<string, AreaChannels>
>("cav-radio-channels-v1", {});
