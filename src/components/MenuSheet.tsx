import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useAtom } from "jotai";
import { Settings, Volume2 } from "lucide-react";
import { type ReactNode } from "react";
import { volumeAtom } from "../atoms/player";
import { SettingsDialog } from "./settings/SettingsDialog";

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
						<Volume2 className="size-5 text-muted-foreground" />
						<SettingsDialog>
							<Button size="icon" variant="ghost">
								<Settings />
							</Button>
						</SettingsDialog>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
