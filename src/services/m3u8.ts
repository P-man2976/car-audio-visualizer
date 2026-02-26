import { Parser } from "m3u8-parser";

export type ParsedM3u8 = {
	segmentCount: number;
	targetDuration: number | null;
	isLive: boolean;
};

export async function fetchAndParseM3u8(url: string): Promise<ParsedM3u8> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`m3u8 fetch failed: ${response.status}`);
	}

	const body = await response.text();
	const parser = new Parser();
	parser.push(body);
	parser.end();

	const manifest = parser.manifest as {
		segments?: Array<unknown>;
		targetDuration?: number;
		endList?: boolean;
	};

	return {
		segmentCount: manifest.segments?.length ?? 0,
		targetDuration: manifest.targetDuration ?? null,
		isLive: manifest.endList !== true,
	};
}
