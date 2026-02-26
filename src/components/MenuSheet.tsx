import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useAtom } from "jotai";
import { type ReactNode } from "react";
import { volumeAtom } from "../atoms/player";

export function MenuSheet({ children }: { children: ReactNode }) {
	const [volume, setVolume] = useAtom(volumeAtom);

	return (
		<Sheet>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent side="left" className="w-fit">
				<div className="h-full flex items-center">
					<div className="flex flex-col items-center h-4/5 gap-4">
						<Slider
							orientation="vertical"
							min={0}
							max={100}
							value={[volume]}
							onValueChange={(val) => {
								setVolume(val[0] ?? volume);
							}}
						/>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
