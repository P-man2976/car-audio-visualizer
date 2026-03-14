import { describe, expect, test } from "vitest";
import type { AreaChannels } from "@/atoms/radio";
import { assignChannelPreset } from "@/lib/radio-presets";

describe("assignChannelPreset", () => {
	test("同じ stationId が別チャンネルにある場合は重複を削除して登録する", () => {
		const area: AreaChannels = {
			fm: {
				1: {
					freq: 90.5,
					type: "FM",
					stationId: "TBS",
					stationName: "TBSラジオ",
				},
			},
			am: {},
		};

		const updated = assignChannelPreset(area, "fm", 4, {
			freq: 90.5,
			type: "FM",
			stationId: "TBS",
			stationName: "TBSラジオ",
		});

		expect(updated.fm[1]).toBeUndefined();
		expect(updated.fm[4]).toEqual({
			freq: 90.5,
			type: "FM",
			stationId: "TBS",
			stationName: "TBSラジオ",
		});
	});

	test("別 stationId の既存チャンネルは保持する", () => {
		const area: AreaChannels = {
			fm: {
				2: {
					freq: 81.3,
					type: "FM",
					stationId: "JWAVE",
					stationName: "J-WAVE",
				},
			},
			am: {},
		};

		const updated = assignChannelPreset(area, "fm", 1, {
			freq: 90.5,
			type: "FM",
			stationId: "TBS",
			stationName: "TBSラジオ",
		});

		expect(updated.fm[2]?.stationId).toBe("JWAVE");
		expect(updated.fm[1]?.stationId).toBe("TBS");
	});
});
