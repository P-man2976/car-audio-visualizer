import { atomWithStorage } from "jotai/utils";

/** localStorage キー（コールバックページからも直接参照する） */
export const LASTFM_SESSION_STORAGE_KEY = "lastfm-session";

/** Last.fm セッション（null = 未連携） */
export const lastfmSessionAtom = atomWithStorage<LastfmSession | null>(
	LASTFM_SESSION_STORAGE_KEY,
	null,
);
