import { audioElementAtom } from "@/atoms/audio";
import {
	explorerCurrentDirAtom,
	explorerSelectedFilesAtom,
} from "@/atoms/explorer";
import { useAddress } from "@/hooks/explorer";
import type { SelectedFile } from "@/types/explorer";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { Folder } from "lucide-react";
import mime from "mime/lite";
import { useCallback, useMemo } from "react";
import { Checkbox } from "../ui/checkbox";

interface EntryInfo {
	name: string;
	handle: FileSystemFileHandle | FileSystemDirectoryHandle;
	isDirectory: boolean;
}

export function FileEntries() {
	const currentDir = useAtomValue(explorerCurrentDirAtom);

	const { data } = useQuery<EntryInfo[]>({
		queryKey: ["explorer", "entries", currentDir?.name ?? "none"],
		enabled: !!currentDir,
		queryFn: async () => {
			if (!currentDir) return [];
			const entries: EntryInfo[] = [];
			for await (const [name, handle] of currentDir.entries()) {
				entries.push({ name, handle, isDirectory: handle.kind === "directory" });
			}
			return entries.sort((a, b) => {
				if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
				return a.name.localeCompare(b.name);
			});
		},
	});

	if (!currentDir) {
		return (
			<div className="flex items-center justify-center h-full text-gray-400 text-sm">
				フォルダが選択されていません
			</div>
		);
	}

	return (
		<div className="flex flex-col overflow-y-auto">
			{data?.map((entry) => <Entry key={entry.name} {...entry} />)}
		</div>
	);
}

function Entry({ name, handle, isDirectory }: EntryInfo) {
	const audioElement = useAtomValue(audioElementAtom);
	const [selected, setSelected] = useAtom(explorerSelectedFilesAtom);
	const { push } = useAddress();

	const canPlay = useMemo(
		() =>
			isDirectory || audioElement.canPlayType(mime.getType(name) ?? "") !== "",
		[audioElement, name, isDirectory],
	);

	const isSelected = useMemo(
		() => selected.some((h) => h.name === handle.name && h.kind === handle.kind),
		[selected, handle],
	);

	const isDisabled = !canPlay && !isDirectory;

	const toggleSelected = useCallback(() => {
		if (isDisabled) return;
		setSelected((prev: SelectedFile[]) =>
			isSelected
				? prev.filter(
						(h) => !(h.name === handle.name && h.kind === handle.kind),
					)
				: [...prev, handle],
		);
	}, [setSelected, isDisabled, isSelected, handle]);

	const handleClick = useCallback(() => {
		if (isDirectory) {
			push(handle as FileSystemDirectoryHandle);
		} else {
			toggleSelected();
		}
	}, [isDirectory, handle, push, toggleSelected]);

	return (
		<div
			className={cn(
				"flex gap-4 py-4 px-4 items-center rounded-md hover:bg-gray-500/30 hover:cursor-pointer",
				{ "opacity-50 hover:cursor-not-allowed": isDisabled },
			)}
			onClick={handleClick}
			onKeyDown={(e) => e.key === "Enter" && handleClick()}
		>
			<Checkbox
				disabled={isDisabled}
				checked={isSelected}
				onClick={(e) => {
					e.stopPropagation();
					toggleSelected();
				}}
			/>
			{isDirectory && <Folder className="text-gray-300" />}
			{name}
		</div>
	);
}
