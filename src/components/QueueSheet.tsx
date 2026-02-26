import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAtomValue } from "jotai";
import { type ReactNode } from "react";
import { currentSrcAtom, queueAtom, songQueueAtom } from "../atoms/player";

export function QueueSheet({ children }: { children: ReactNode }) {
	const currentSrc = useAtomValue(currentSrcAtom);
	const radioQueue = useAtomValue(queueAtom);
	const songQueue = useAtomValue(songQueueAtom);

	const isFile = currentSrc === "file";

	return (
		<Sheet>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent side="right" className="max-w-sm sm:min-w-96 overflow-y-auto px-4">
				<div className="flex flex-col gap-4">
					<h3 className="font-bold text-xl pl-2">
						{isFile ? "再生待ち" : "最近再生した局"}
					</h3>
					<div className="flex flex-col gap-2">
						{isFile ? (
							songQueue.length ? (
								songQueue.map((song) => (
									<div key={song.id} className="rounded-md bg-neutral-800/50 px-3 py-2 text-sm">
										{song.title ?? song.filename}
									</div>
								))
							) : (
								<div className="text-sm text-muted-foreground">キューは空です</div>
							)
						) : radioQueue.length ? (
							radioQueue.map((name, index) => (
								<div key={`${name}-${index}`} className="rounded-md bg-neutral-800/50 px-3 py-2 text-sm">
									{name}
								</div>
							))
						) : (
							<div className="text-sm text-muted-foreground">キューは空です</div>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
