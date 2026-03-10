import { createStore } from "jotai";
import { describe, expect, test } from "vitest";
import { LASTFM_SESSION_STORAGE_KEY, lastfmSessionAtom } from "./lastfm";

describe("lastfm atoms", () => {
	test("LASTFM_SESSION_STORAGE_KEY は 'lastfm-session'", () => {
		expect(LASTFM_SESSION_STORAGE_KEY).toBe("lastfm-session");
	});

	test("lastfmSessionAtom のデフォルトは null (未連携)", () => {
		const store = createStore();
		expect(store.get(lastfmSessionAtom)).toBeNull();
	});

	test("セッション情報を保存・取得できる", () => {
		const store = createStore();
		const session: LastfmSession = {
			name: "testuser",
			key: "abc123",
		};
		store.set(lastfmSessionAtom, session);
		expect(store.get(lastfmSessionAtom)).toEqual(session);
	});
});
