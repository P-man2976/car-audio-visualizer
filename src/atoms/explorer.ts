import { atom } from "jotai";
import type { SelectedFile } from "@/types/explorer";

/** Current navigation stack (index 0 = root, last = current dir) */
export const explorerNavigationStackAtom = atom<FileSystemDirectoryHandle[]>(
	[],
);

/** Forward stack for "forward" navigation */
export const explorerForwardStackAtom = atom<FileSystemDirectoryHandle[]>([]);

/** Derived: currently displayed directory handle */
export const explorerCurrentDirAtom = atom<FileSystemDirectoryHandle | null>(
	(get) => get(explorerNavigationStackAtom).at(-1) ?? null,
);

/** Selected files/directories to be queued */
export const explorerSelectedFilesAtom = atom<SelectedFile[]>([]);
