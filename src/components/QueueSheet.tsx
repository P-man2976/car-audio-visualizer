import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Reorder, useDragControls } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { GripVertical, RadioTower } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { currentSrcAtom, queueAtom, songQueueAtom } from "../atoms/player";
import { currentRadioAtom } from "../atoms/radio";
import type { Radio } from "../types/radio";
import type { Song } from "../types/player";
import { usePlayer } from "../hooks/player";

export function QueueSheet({ children }: { children: ReactNode }) {
	const currentSrc = useAtomValue(currentSrcAtom);
	const isFile = currentSrc === "file";

	return (
		<Sheet>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent side="right" className="max-w-sm sm:min-w-96 overflow-y-auto px-4">
				<SheetHeader>
					<SheetTitle className="text-xl pl-2">
						{isFile ? "再生待ち" : "最近再生した局"}
					</SheetTitle>
				</SheetHeader>
				{isFile ? <SongQueueList /> : <RadioQueueList />}
			</SheetContent>
		</Sheet>
	);
}

/* ---------- ファイルキュー ---------- */

function SongQueueList() {
	const [songQueue, setSongQueue] = useAtom(songQueueAtom);

	if (!songQueue.length) {
		return <p className="text-sm text-muted-foreground pl-2 mt-4">キューは空です</p>;
	}

	return (
		<Reorder.Group
			as="div"
			axis="y"
			layoutScroll
			values={songQueue}
			onReorder={setSongQueue}
			className="flex flex-col gap-2 mt-4"
		>
			{songQueue.map((song) => (
				<QueueSongCard key={song.id} song={song} />
			))}
		</Reorder.Group>
	);
}

function QueueSongCard({ song }: { song: Song }) {
	const { id, filename, title, album, artwork } = song;
	const controls = useDragControls();
	const { skipTo } = usePlayer();
	const containerRef = useRef<HTMLDivElement>(null);
	const titleRef = useRef<HTMLSpanElement>(null);
	const albumRef = useRef<HTMLSpanElement>(null);

	return (
		<Reorder.Item
			as="div"
			value={song}
			dragListener={false}
			dragControls={controls}
			className="rounded-md bg-neutral-800/50 flex items-center gap-2 pr-3 py-2 cursor-default select-none"
		>
			<GripVertical
				size={18}
				className="shrink-0 text-gray-500 hover:text-gray-300 hover:cursor-move touch-none ml-1"
				onPointerDown={(e) => controls.start(e)}
			/>
			{artwork ? (
				<img src={artwork} alt={title ?? filename} className="h-10 w-10 rounded-sm object-cover shrink-0" />
			) : (
				<div className="h-10 w-10 rounded-sm bg-neutral-700/60 shrink-0" />
			)}
			<div
				ref={containerRef}
				className="flex flex-col gap-0.5 overflow-hidden w-full hover:cursor-pointer"
				onClick={() => skipTo(id)}
			>
				<span
					ref={titleRef}
					className={cn("text-sm whitespace-nowrap w-fit", {
						"animate-scroll":
							(titleRef.current?.clientWidth ?? 0) > (containerRef.current?.clientWidth ?? 0),
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
								(albumRef.current?.clientWidth ?? 0) > (containerRef.current?.clientWidth ?? 0),
						})}
						style={{ animationDuration: `${album.length}s` }}
					>
						{album}
					</span>
				)}
			</div>
		</Reorder.Item>
	);
}

/* ---------- ラジオ履歴 ---------- */

function RadioQueueList() {
	const radioQueue = useAtomValue(queueAtom);

	if (!radioQueue.length) {
		return <p className="text-sm text-muted-foreground pl-2 mt-4">キューは空です</p>;
	}

	return (
		<div className="flex flex-col gap-2 mt-4">
			{radioQueue.map((station, index) => (
				<RadioQueueCard
					key={station.source === "radiko" ? `${station.id}-${index}` : `${station.url}-${index}`}
					station={station}
				/>
			))}
		</div>
	);
}

function RadioQueueCard({ station }: { station: Radio }) {
	const setCurrentRadio = useSetAtom(currentRadioAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);

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
				setCurrentRadio(station);
				setCurrentSrc("radio");
			}}
		>
			{logo ? (
				<img src={logo} alt={name} className="h-10 w-10 rounded-sm object-cover shrink-0 ml-2" />
			) : (
				<div className="h-10 w-10 rounded-sm bg-neutral-700/60 shrink-0 grid place-content-center ml-2">
					<RadioTower size={18} className="text-gray-400" />
				</div>
			)}
			<div className="flex flex-col gap-0.5 overflow-hidden">
				<span className="text-sm truncate">{name}</span>
				<span className="text-xs text-gray-400 truncate">{subtitle}</span>
			</div>
		</div>
	);
}
