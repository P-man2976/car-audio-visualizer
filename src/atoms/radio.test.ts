import { createStore } from "jotai";
import { describe, expect, test } from "vitest";
import {
	currentRadioAtom,
	customFrequencyAreaAtom,
	radioChannelsByAreaAtom,
	radioStationSizeAtom,
	tuningFreqAtom,
} from "./radio";

describe("radio atoms", () => {
	test("currentRadioAtom のデフォルトは null", () => {
		const store = createStore();
		expect(store.get(currentRadioAtom)).toBeNull();
	});

	test("radioStationSizeAtom のデフォルトは 'lg'", () => {
		const store = createStore();
		expect(store.get(radioStationSizeAtom)).toBe("lg");
	});

	test("radioStationSizeAtom は 'sm' と 'lg' を受け付ける", () => {
		const store = createStore();
		store.set(radioStationSizeAtom, "sm");
		expect(store.get(radioStationSizeAtom)).toBe("sm");
		store.set(radioStationSizeAtom, "lg");
		expect(store.get(radioStationSizeAtom)).toBe("lg");
	});

	test("customFrequencyAreaAtom のデフォルトは空配列", () => {
		const store = createStore();
		expect(store.get(customFrequencyAreaAtom)).toEqual([]);
	});

	test("tuningFreqAtom のデフォルトは null", () => {
		const store = createStore();
		expect(store.get(tuningFreqAtom)).toBeNull();
	});

	test("tuningFreqAtom に数値を set できる", () => {
		const store = createStore();
		store.set(tuningFreqAtom, 82.5);
		expect(store.get(tuningFreqAtom)).toBe(82.5);
	});

	test("radioChannelsByAreaAtom のデフォルトは空オブジェクト", () => {
		const store = createStore();
		expect(store.get(radioChannelsByAreaAtom)).toEqual({});
	});

	test("radioChannelsByAreaAtom にエリア別プリセットを保存できる", () => {
		const store = createStore();
		const preset = {
			JP13: {
				fm: {
					1: {
						freq: 80.0,
						type: "fm" as const,
						stationId: "TFM",
						stationName: "TOKYO FM",
					},
				},
				am: {},
			},
		};
		store.set(radioChannelsByAreaAtom, preset);
		expect(store.get(radioChannelsByAreaAtom)).toEqual(preset);
	});
});
