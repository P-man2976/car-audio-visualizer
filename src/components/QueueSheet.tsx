import { Reorder, useDragControls } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	GripVertical,
	ListEnd,
	ListStart,
	Play,
	RadioTower,
	Trash2,
} from "lucide-react";
import { type ReactNode, useMemo, useRef } from "react";
import { VList } from "virtua";
import {
	currentSrcAtom,
	queueAtom,
	songHistoryAtom,
	songQueueAtom,
} from "@/atoms/player";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlayer } from "@/hooks/player";
import { useSelectRadio } from "@/hooks/radio";
import { cn } from "@/lib/utils";
import type { Song } from "@/types/player";
import type { Radio } from "@/types/radio";

export function QueueSheet({ children }: { children: ReactNode }) {
	const currentSrc = useAtomValue(currentSrcAtom);
	const isFile = currentSrc === "file";

	return (
		<Sheet>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent
				side="right"
				className="max-w-sm sm:min-w-96 flex flex-col overflow-hidden px-4"
			>
				<SheetHeader>
					<SheetTitle className="text-xl pl-2">
						{isFile ? "キュー" : "最近再生した局"}
					</SheetTitle>
				</SheetHeader>
				{isFile ? <SongQueueTabs /> : <RadioQueueList />}
			</SheetContent>
		</Sheet>
	);
}

/* ---------- ファイルキュー タブ ---------- */

function SongQueueTabs() {
	return (
		<Tabs defaultValue="queue" className="mt-2 flex-1 flex flex-col min-h-0">
			<TabsList variant="line" className="w-full shrink-0">
				<TabsTrigger value="queue">再生待ち</TabsTrigger>
				<TabsTrigger value="history">履歴</TabsTrigger>
			</TabsList>
			<TabsContent value="queue" className="flex-1 min-h-0 overflow-hidden">
				<SongQueueList />
			</TabsContent>
			<TabsContent
				value="history"
				className="flex-1 min-h-0 overflow-hidden flex flex-col"
			>
				<SongHistoryList />
			</TabsContent>
		</Tabs>
	);
}

/* ---------- ファイルキュー ---------- */

function SongQueueList() {
	const [songQueue, setSongQueue] = useAtom(songQueueAtom);

	if (!songQueue.length) {
		return (
			<p className="text-sm text-muted-foreground pl-2 mt-4">キューは空です</p>
		);
	}

	return (
		<Reorder.Group
			as="div"
			axis="y"
			layoutScroll
			values={songQueue}
			onReorder={setSongQueue}
			className="flex flex-col gap-2 mt-4 overflow-y-auto h-full"
		>
			{songQueue.map((song) => (
				<QueueSongCard key={song.id} song={song} context="queue" />
			))}
		</Reorder.Group>
	);
}

/* ---------- ファイル履歴 ---------- */

function SongHistoryList() {
	const songHistory = useAtomValue(songHistoryAtom);

	const reversed = useMemo(() => [...songHistory].reverse(), [songHistory]);

	if (!songHistory.length) {
		return (
			<p className="text-sm text-muted-foreground pl-2 mt-4">
				履歴はありません
			</p>
		);
	}

	return (
		<VList className="flex-1 min-h-0 mt-4">
			{reversed.map((song, index) => (
				<div key={`${song.id}-${index}`} className="pb-2">
					<QueueSongCard song={song} context="history" />
				</div>
			))}
		</VList>
	);
}

/* ---------- 曲カード ---------- */

function QueueSongCard({
	song,
	context,
}: {
	song: Song;
	context: "queue" | "history";
}) {
	const { id, filename, title, album, artwork } = song;
	const controls = useDragControls();
	const { skipTo } = usePlayer();
	const setSongQueue = useSetAtom(songQueueAtom);
	const containerRef = useRef<HTMLDivElement>(null);
	const titleRef = useRef<HTMLSpanElement>(null);
	const albumRef = useRef<HTMLSpanElement>(null);

	const isDraggable = context === "queue";

	const cardBody = (
		<>
			{isDraggable && (
				<GripVertical
					size={20}
					className="shrink-0 text-gray-500 hover:text-gray-300 hover:cursor-move touch-none ml-1"
					onPointerDown={(e) => controls.start(e)}
				/>
			)}
			{artwork ? (
				<img
					src={artwork}
					alt={title ?? filename}
					className="h-10 w-10 rounded-sm object-cover shrink-0"
				/>
			) : (
				<div className="h-10 w-10 rounded-sm bg-neutral-700/60 shrink-0" />
			)}
			<div
				ref={containerRef}
				className="flex flex-col gap-0.5 overflow-hidden w-full hover:cursor-pointer"
				onClick={() => {
					if (context === "queue") {
						skipTo(id);
					} else {
						// 履歴からはキューの先頭に新IDで追加して再生
						const newId = crypto.randomUUID();
						setSongQueue((prev) => [{ ...song, id: newId }, ...prev]);
						queueMicrotask(() => skipTo(newId));
					}
				}}
			>
				<span
					ref={titleRef}
					className={cn("text-sm whitespace-nowrap w-fit", {
						"animate-scroll":
							(titleRef.current?.clientWidth ?? 0) >
							(containerRef.current?.clientWidth ?? 0),
					})}
					style={{ animationDuration: `${(title ?? filename).length}s` }}
				>
					{title ?? filename}
				</span>
				{album && (
					<span
						ref={albumRef}
						className={cn("text-xs text-gray-400 whitespace-nowrap w-fit", {
							"animate-scroll":
								(albumRef.current?.clientWidth ?? 0) >
								(containerRef.current?.clientWidth ?? 0),
						})}
						style={{ animationDuration: `${album.length}s` }}
					>
						{album}
					</span>
				)}
			</div>
		</>
	);

	const card = isDraggable ? (
		<Reorder.Item
			as="div"
			value={song}
			dragListener={false}
			dragControls={controls}
			className={cn(
				"rounded-md bg-neutral-800/50 flex items-center gap-2 pr-3 py-2 cursor-default select-none",
				!isDraggable && "pl-3",
			)}
		>
			{cardBody}
		</Reorder.Item>
	) : (
		<div
			className={cn(
				"rounded-md bg-neutral-800/50 flex items-center gap-2 pr-3 py-2 cursor-default select-none pl-3",
			)}
		>
			{cardBody}
		</div>
	);

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
			<ContextMenuContent>
				{context === "queue" ? (
					<QueueContextMenuItems song={song} />
				) : (
					<HistoryContextMenuItems song={song} />
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}

/* ---------- キュータブ用のコンテキストメニュー項目 ---------- */

function QueueContextMenuItems({ song }: { song: Song }) {
	const { skipTo } = usePlayer();
	const setSongQueue = useSetAtom(songQueueAtom);

	return (
		<>
			<ContextMenuItem onClick={() => skipTo(song.id)} className="gap-2">
				<Play size={14} />
				再生
			</ContextMenuItem>
			<ContextMenuItem
				onClick={() => {
					setSongQueue((prev) => {
						const filtered = prev.filter((s) => s.id !== song.id);
						return [song, ...filtered];
					});
				}}
				className="gap-2"
			>
				<ListStart size={14} />
				次に再生
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem
				onClick={() => {
					setSongQueue((prev) => prev.filter((s) => s.id !== song.id));
				}}
				className="gap-2 text-red-400 focus:text-red-400"
			>
				<Trash2 size={14} />
				キューから削除
			</ContextMenuItem>
		</>
	);
}

/* ---------- 履歴タブ用のコンテキストメニュー項目 ---------- */

function HistoryContextMenuItems({ song }: { song: Song }) {
	const setSongQueue = useSetAtom(songQueueAtom);

	return (
		<>
			<ContextMenuItem
				onClick={() => {
					setSongQueue((prev) => [
						{ ...song, id: crypto.randomUUID() },
						...prev,
					]);
				}}
				className="gap-2"
			>
				<ListStart size={14} />
				次に再生
			</ContextMenuItem>
			<ContextMenuItem
				onClick={() => {
					setSongQueue((prev) => [
						...prev,
						{ ...song, id: crypto.randomUUID() },
					]);
				}}
				className="gap-2"
			>
				<ListEnd size={14} />
				キューの最後に追加
			</ContextMenuItem>
		</>
	);
}

/* ---------- ラジオ履歴 ---------- */

function RadioQueueList() {
	const radioQueue = useAtomValue(queueAtom);

	if (!radioQueue.length) {
		return (
			<p className="text-sm text-muted-foreground pl-2 mt-4">キューは空です</p>
		);
	}

	return (
		<VList className="flex-1 min-h-0 mt-4">
			{radioQueue.map((station, index) => (
				<div
					key={
						station.source === "radiko"
							? `${station.id}-${index}`
							: `${station.url}-${index}`
					}
					className="pb-2"
				>
					<RadioQueueCard station={station} />
				</div>
			))}
		</VList>
	);
}

function RadioQueueCard({ station }: { station: Radio }) {
	const { selectRadio } = useSelectRadio();

	const name = station.name;
	const logo = station.logo;
	const subtitle =
		station.frequency != null
			? station.type === "AM"
				? `${station.frequency} kHz`
				: `${station.frequency.toFixed(1)} MHz`
			: station.source === "radiru"
				? "NHKラジオ らじる★らじる"
				: "Radiko";

	return (
		<div
			className="rounded-md bg-neutral-800/50 flex items-center gap-2 pr-3 py-2 cursor-pointer select-none hover:bg-neutral-700/50 transition-colors"
			onClick={() => {
				selectRadio(station);
			}}
		>
			{logo ? (
				<img
					src={logo}
					alt={name}
					className="h-10 w-10 rounded-sm object-cover shrink-0 ml-2"
				/>
			) : (
				<div className="h-10 w-10 rounded-sm bg-neutral-700/60 shrink-0 grid place-content-center ml-2">
					<RadioTower size={20} className="text-gray-400" />
				</div>
			)}
			<div className="flex flex-col gap-0.5 overflow-hidden">
				<span className="text-sm truncate">{name}</span>
				<span className="text-xs text-gray-400 truncate">{subtitle}</span>
			</div>
		</div>
	);
}
