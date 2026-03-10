import { createStore } from "jotai";
import { describe, expect, test } from "vitest";
import {
	animationModeAtom,
	steppedFallSpeedAtom,
	steppedIntervalAtom,
	steppedPeakFallSpeedAtom,
	steppedPeakHoldTimeAtom,
} from "./visualizerAnimation";

describe("visualizerAnimation atoms", () => {
	test("animationModeAtom のデフォルトは 'realtime'", () => {
		const store = createStore();
		expect(store.get(animationModeAtom)).toBe("realtime");
	});

	test("animationModeAtom は 'stepped' に切り替えられる", () => {
		const store = createStore();
		store.set(animationModeAtom, "stepped");
		expect(store.get(animationModeAtom)).toBe("stepped");
	});

	test("steppedIntervalAtom のデフォルトは 200ms", () => {
		const store = createStore();
		expect(store.get(steppedIntervalAtom)).toBe(200);
	});

	test("steppedFallSpeedAtom のデフォルトは 1.0", () => {
		const store = createStore();
		expect(store.get(steppedFallSpeedAtom)).toBe(1.0);
	});

	test("steppedPeakHoldTimeAtom のデフォルトは 500ms", () => {
		const store = createStore();
		expect(store.get(steppedPeakHoldTimeAtom)).toBe(500);
	});

	test("steppedPeakFallSpeedAtom のデフォルトは 0.3", () => {
		const store = createStore();
		expect(store.get(steppedPeakFallSpeedAtom)).toBe(0.3);
	});

	test("ステップモードの各パラメータを更新できる", () => {
		const store = createStore();
		store.set(steppedIntervalAtom, 100);
		store.set(steppedFallSpeedAtom, 2.0);
		store.set(steppedPeakHoldTimeAtom, 1000);
		store.set(steppedPeakFallSpeedAtom, 0.5);

		expect(store.get(steppedIntervalAtom)).toBe(100);
		expect(store.get(steppedFallSpeedAtom)).toBe(2.0);
		expect(store.get(steppedPeakHoldTimeAtom)).toBe(1000);
		expect(store.get(steppedPeakFallSpeedAtom)).toBe(0.5);
	});
});
