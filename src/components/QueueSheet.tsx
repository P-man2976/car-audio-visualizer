import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAtom } from "jotai";
import { type ReactNode } from "react";
import { queueAtom } from "../atoms/player";

export function QueueSheet({ children }: { children: ReactNode }) {
	const [queue] = useAtom(queueAtom);

	return (
		<Sheet>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent side="right" className="max-w-sm sm:min-w-96 overflow-y-auto px-4">
				<div className="flex flex-col gap-4">
					<h3 className="font-bold text-xl pl-2">再生待ち</h3>
					<div className="flex flex-col gap-2">
						{queue.length ? (
							queue.map((item, index) => (
								<div key={`${item}-${index}`} className="rounded-md bg-neutral-800/50 px-3 py-2 text-sm">
									{item}
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
