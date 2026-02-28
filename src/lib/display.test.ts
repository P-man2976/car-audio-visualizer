import { describe, expect, it } from "vitest";
import { buildDisplayString } from "./display";

describe("buildDisplayString", () => {
	it("returns ALL OFF in off mode", () => {
		expect(buildDisplayString("off", undefined, 0).trim()).toBe("ALL OFF");
	});

	it("returns FM display for FM radio without frequency", () => {
		expect(
			buildDisplayString(
				"radio",
				{ type: "FM", source: "radiko", id: "FMJ", name: "J-WAVE" },
				0,
			),
		).toBe("F1- --.- MHz");
	});

	it("returns FM display for FM radio with frequency", () => {
		expect(
			buildDisplayString(
				"radio",
				{
					type: "FM",
					source: "radiko",
					id: "FMJ",
					name: "J-WAVE",
					frequency: 81.3,
				},
				0,
			),
		).toBe("F1- 81.3 MHz");
	});

	it("returns AM display for AM radio without frequency (radiru)", () => {
		expect(
			buildDisplayString(
				"radio",
				{
					type: "AM",
					source: "radiru",
					url: "https://example.com",
					name: "ラジオ第一",
				},
				0,
			),
		).toBe("A1- ---- kHz");
	});

	it("returns AM display for AM radio with frequency", () => {
		expect(
			buildDisplayString(
				"radio",
				{
					type: "AM",
					source: "radiko",
					id: "TBS",
					name: "TBSラジオ",
					frequency: 954,
				},
				0,
			),
		).toBe("A1-  954 kHz");
	});

	it("returns AUX MODE in aux mode", () => {
		expect(buildDisplayString("aux", undefined, 0).trim()).toBe("AUX MODE");
	});

	it("returns CD display in file mode without song", () => {
		expect(buildDisplayString("file", undefined, 0)).toBe("CD---   0:00");
	});

	it("returns CD display in file mode with song and progress", () => {
		const song = { id: "1", filename: "track.mp3", url: "", track: { no: 3 } };
		expect(buildDisplayString("file", undefined, 65, song)).toBe(
			"CD-03   1:05",
		);
	});
});
