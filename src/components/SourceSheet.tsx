import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAtom } from "jotai";
import { type ReactNode } from "react";
import { mediaStreamAtom } from "../atoms/audio";
import { currentSrcAtom } from "../atoms/player";
import { radioStationSizeAtom } from "../atoms/radio";
import { useMediaStream } from "../hooks/mediastream";
import { useRadikoStationList } from "../services/radiko";
import { useRadiruStationList } from "../services/radiru";
import { DisconnectInput } from "./source/DisconnectInput";
import { ExternalInput } from "./source/ExternalInput";
import { RadioStation } from "./source/RadioStation";
import { RadiruStation } from "./source/RadiruStation";
import { ScreenShare } from "./source/ScreenShare";
import { ExplorerDialog } from "./explorer/ExplorerDialog";
import { FilePicker } from "./FilePicker";
import { LayoutGrid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

export function SourceSheet({ children }: { children: ReactNode }) {
	const [currentSrc, setCurrentSrc] = useAtom(currentSrcAtom);
	const [radioStationSize, setRadioStationSize] = useAtom(radioStationSizeAtom);
	const [mediaStream] = useAtom(mediaStreamAtom);
	const { disconnect } = useMediaStream();
	const { data: radikoStationList } = useRadikoStationList();
	const { data: radiruStationList } = useRadiruStationList();

	return (
		<Sheet>
			<SheetTrigger asChild>{children}</SheetTrigger>
			<SheetContent side="top" className="max-h-[80vh] overflow-y-auto">
				<Tabs
					value={currentSrc}
					onValueChange={(value) => {
						setCurrentSrc(value as "off" | "file" | "radio" | "aux");
						if (value !== "aux") disconnect();
					}}
				>
					<TabsList className="grid grid-cols-4 w-full">
						<TabsTrigger value="off">ALL OFF</TabsTrigger>
						<TabsTrigger value="file">ファイル</TabsTrigger>
						<TabsTrigger value="radio">ラジオ</TabsTrigger>
						<TabsTrigger value="aux">外部入力</TabsTrigger>
					</TabsList>

					<TabsContent className="py-4" value="off">
						<div className="flex w-full items-center justify-center py-8">
							<span className="text-gray-400 text-lg">ＡＬＬ　ＯＦＦ</span>
						</div>
					</TabsContent>

					<TabsContent className="py-4" value="file">
						<div className="flex w-full flex-col gap-3">
							<FilePicker />
							<ExplorerDialog>
								<Button className="w-full">
									組み込みのエクスプローラーから読み込み
								</Button>
							</ExplorerDialog>
						</div>
					</TabsContent>

					<TabsContent value="radio">
						<div className="flex flex-col gap-4 py-4">
							<div className="flex w-full justify-between items-center">
								<h4 className="text-lg">Radiko</h4>
								<Button
									size="icon"
									onClick={() => setRadioStationSize((size) => (size === "lg" ? "sm" : "lg"))}
								>
									{radioStationSize === "lg" ? <LayoutGrid className="size-4" /> : <LayoutList className="size-4" />}
								</Button>
							</div>
							<div
								className={cn(
									"grid gap-4",
									radioStationSize === "lg"
										? "grid-cols-3"
										: "grid-cols-[repeat(auto-fit,minmax(100px,1fr))]"
								)}
							>
								{radikoStationList?.map((station) => (
									<RadioStation key={station.id} {...station} />
								))}
							</div>
							<Separator />
							<h4 className="text-lg">NHKラジオ らじる★らじる</h4>
							<div className="grid grid-cols-3 gap-4">
								{radiruStationList?.map((station) => (
									<RadiruStation key={station.areakey} {...station} />
								))}
							</div>
						</div>
					</TabsContent>

					<TabsContent className="py-4" value="aux">
						<div className="flex w-full flex-col gap-4">
							{mediaStream ? (
								<DisconnectInput />
							) : (
								<>
									<ScreenShare />
									<ExternalInput />
								</>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</SheetContent>
		</Sheet>
	);
}

