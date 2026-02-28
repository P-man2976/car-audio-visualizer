import { atomWithStorage } from "jotai/utils";

/** Last.fm セッション（null = 未連携） */
export const lastfmSessionAtom = atomWithStorage<LastfmSession | null>(
	"lastfm-session",
	null,
);
