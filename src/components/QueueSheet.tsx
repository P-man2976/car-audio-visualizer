import {
	DndContext,
	type DragEndEvent,
	PointerSensor,
	TouchSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	GripVertical,
	ListEnd,
	ListStart,
	Music2,
	Play,
	RadioTower,
	Repeat,
	Trash2,
} from "lucide-react";
import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { VList } from "virtua";
import {
	currentSongAtom,
	currentSrcAtom,
	queueAtom,
	repeatModeAtom,
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
	const isRadio = currentSrc === "radio";

	return (
		<Sheet>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent
				side="right"
				className="max-w-sm sm:min-w-96 flex flex-col overflow-hidden px-4"
			>
				<SheetHeader>
					<SheetTitle className="text-xl pl-2">
						{isRadio ? "最近再生した局" : "キュー"}
					</SheetTitle>
				</SheetHeader>
				{isRadio ? <RadioQueueList /> : <SongQueueTabs />}
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
	const repeatMode = useAtomValue(repeatModeAtom);
	const currentSong = useAtomValue(currentSongAtom);
	const songHistory = useAtomValue(songHistoryAtom);

	const repeatCount =
		repeatMode === "all"
			? (currentSong ? 1 : 0) + songQueue.length + songHistory.length
			: 0;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 150, tolerance: 5 },
		}),
	);

	const songIds = useMemo(() => songQueue.map((s) => s.id), [songQueue]);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;
			setSongQueue((prev) => {
				const oldIndex = prev.findIndex((s) => s.id === active.id);
				const newIndex = prev.findIndex((s) => s.id === over.id);
				if (oldIndex === -1 || newIndex === -1) return prev;
				const next = [...prev];
				const [moved] = next.splice(oldIndex, 1);
				next.splice(newIndex, 0, moved);
				return next;
			});
		},
		[setSongQueue],
	);

	if (!songQueue.length) {
		return (
			<p className="text-sm text-muted-foreground pl-2 mt-4">キューは空です</p>
		);
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext items={songIds} strategy={verticalListSortingStrategy}>
				<VList className="flex-1 min-h-0 mt-4">
					{songQueue.map((song) => (
						<div key={song.id} className="pb-2">
							<QueueSongCard song={song} context="queue" />
						</div>
					))}
					{repeatCount > 0 && (
						<div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
							<Repeat size={14} />
							<span>{repeatCount}曲をリピート</span>
						</div>
					)}
				</VList>
			</SortableContext>
		</DndContext>
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
	const { skipTo } = usePlayer();
	const setSongQueue = useSetAtom(songQueueAtom);
	const containerRef = useRef<HTMLDivElement>(null);
	const titleRef = useRef<HTMLSpanElement>(null);
	const albumRef = useRef<HTMLSpanElement>(null);

	const isDraggable = context === "queue";

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id, disabled: !isDraggable });

	const style = isDraggable
		? {
				transform: CSS.Transform.toString(transform),
				transition,
				opacity: isDragging ? 0.5 : undefined,
			}
		: undefined;

	const cardBody = (
		<>
			{isDraggable && (
				<GripVertical
					size={20}
					className="shrink-0 text-gray-500 hover:text-gray-300 hover:cursor-move touch-none ml-1"
					{...listeners}
				/>
			)}
			{artwork ? (
				<img
					src={artwork}
					alt={title ?? filename}
					className="h-10 w-10 rounded-sm object-cover shrink-0"
				/>
			) : (
				<div className="h-10 w-10 rounded-sm bg-neutral-700/60 shrink-0 grid place-content-center">
					<Music2 size={16} className="text-neutral-400" />
				</div>
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

	const card = (
		<div
			ref={isDraggable ? setNodeRef : undefined}
			style={style}
			{...(isDraggable ? attributes : {})}
			className={cn(
				"rounded-md bg-neutral-800/50 flex items-center gap-2 pr-3 py-2 cursor-default select-none",
				isDraggable ? "" : "pl-3",
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
