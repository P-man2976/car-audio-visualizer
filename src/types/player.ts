export interface Song {
	id: string;
	filename: string;
	url: string;
	artwork?: string;
	duration?: number;
	title?: string;
	track: { no?: number; of?: number };
	album?: string;
	artists?: string[];
	genre?: string[];
	date?: string;
	year?: number;
}

/**
 * Persisted subset of Song that survives page reloads.
 * Blob URLs (url, artwork) are intentionally omitted because they become
 * invalid after reload and must be recreated from the original file.
 */
export type SongStub = Omit<Song, "url" | "artwork">;

/** Strip ephemeral blob URLs to produce a persistable stub. */
export function songToStub({
	url: _url,
	artwork: _artwork,
	...rest
}: Song): SongStub {
	return rest;
}
