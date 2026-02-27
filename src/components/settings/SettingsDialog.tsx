import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAtom } from "jotai";
import { type ReactNode } from "react";
import { type RepeatMode, repeatModeAtom, shuffleAtom } from "../../atoms/player";

export function SettingsDialog({ children }: { children: ReactNode }) {
	const [shuffle, setShuffle] = useAtom(shuffleAtom);
	const [repeat, setRepeat] = useAtom(repeatModeAtom);

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>設定</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-5 pt-2">
					{/* シャッフル */}
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">シャッフル</span>
						<Switch checked={shuffle} onCheckedChange={setShuffle} />
					</div>

					<Separator />

					{/* リピート */}
					<div className="flex flex-col gap-3">
						<span className="text-sm font-medium">リピート</span>
						<Tabs
							value={repeat}
							onValueChange={(v) => setRepeat(v as RepeatMode)}
						>
							<TabsList className="w-full">
								<TabsTrigger value="off" className="flex-1">
									オフ
								</TabsTrigger>
								<TabsTrigger value="one" className="flex-1">
									1曲
								</TabsTrigger>
								<TabsTrigger value="all" className="flex-1">
									全曲
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
