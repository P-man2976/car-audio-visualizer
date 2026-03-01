import type { Source } from "../atoms/player";
import type { Radio } from "../types/radio";
import type { Song } from "../types/player";

export function buildDisplayString(
	source: Source,
	radio: Radio | null | undefined,
	progress: number,
	song?: Song | null,
	tuningFreq?: number | null,
	channelNum?: number | null,
): string {
	if (source === "off") {
		return "ALL OFF".padEnd(12, " ");
	}

	if (source === "radio") {
		const type = radio?.type ?? "FM";
		const freq = tuningFreq ?? radio?.frequency;
		// チャンネル表示: チューニングアニメーション中は非表示
		const ch = tuningFreq == null ? (channelNum ?? null) : null;
		if (type === "AM") {
			if (ch != null) {
				return `A1- ${freq?.toString().padStart(4, " ") ?? "----"} -${ch}c`;
			}
			return `A1- ${freq?.toString().padStart(4, " ") ?? "----"} kHz`;
		}
		if (ch != null) {
			return `F1- ${freq?.toFixed(1) ?? "--.-"} -${ch}c`;
		}
		return `F1- ${freq?.toFixed(1) ?? "--.-"} MHz`;
	}

	if (source === "aux") {
		return "AUX MODE".padEnd(12, " ");
	}

	if (source === "file") {
		const track = (song?.track?.no?.toString() ?? "--").padStart(2, "0");
		const min = Math.floor(progress / 60)
			.toString()
			.padStart(1, "0");
		const sec = Math.floor(progress % 60)
			.toString()
			.padStart(2, "0");
		return `CD-${track}${`${min}:${sec}`.padStart(7, " ")}`;
	}

	return "".padEnd(12, " ");
}
