import type { Source } from "../atoms/player";
import type { Radio } from "../types/radio";

export function buildDisplayString(source: Source, radio: Radio | null | undefined, _progress: number): string {
	if (source === "off") {
		return "ALL OFF".padEnd(12, " ");
	}

	if (source === "radio") {
		if (radio?.type === "AM") {
			return `A1- ${radio.frequency?.toString().padStart(4, " ") ?? "----"} kHz`;
		}
		return `F1- ${radio?.frequency?.toFixed(1) ?? "--.-"} MHz`;
	}

	if (source === "aux") {
		return "AUX MODE".padEnd(12, " ");
	}

	return "".padEnd(12, " ");
}