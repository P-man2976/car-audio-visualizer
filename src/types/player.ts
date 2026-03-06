/**
 * Runtime song object.
 *
 * `url` and `artwork` are blob URLs created at runtime — they are stripped
 * before IndexedDB persistence and recreated from `handle` after reload.
 * `handle` is a FileSystemFileHandle obtained via the File System Access API;
 * it is structured-cloneable and stored directly in IndexedDB.
 */
export interface Song {
	id: string;
	filename: string;
	/** Blob URL for the audio element. Absent when hydrated from IDB before restoration. */
	url?: string;
	/** Blob URL for cover artwork. */
	artwork?: string;
	/** FileSystemFileHandle — present when loaded via showOpenFilePicker / showDirectoryPicker. */
	handle?: FileSystemFileHandle;
	duration?: number;
	title?: string;
	track: { no?: number; of?: number };
	album?: string;
	artists?: string[];
	genre?: string[];
	date?: string;
	year?: number;
}
