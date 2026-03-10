import { createStore } from "jotai";
import { describe, expect, test } from "vitest";
import { displayStringAtom } from "./display";

describe("display atoms", () => {
	test("displayStringAtom のデフォルトは 'ALL OFF' の12文字パディング", () => {
		const store = createStore();
		const value = store.get(displayStringAtom);
		expect(value).toBe("ALL OFF     ");
		expect(value.length).toBe(12);
	});

	test("displayStringAtom を更新できる", () => {
		const store = createStore();
		store.set(displayStringAtom, "FM 80.0 MHz ");
		expect(store.get(displayStringAtom)).toBe("FM 80.0 MHz ");
	});
});
