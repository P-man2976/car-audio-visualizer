/**
 * 設定ダイアログ（ペーン型）
 *
 * 左サイドバーでカテゴリを選択し、右ペインで各設定を表示する。
 * 各タブの実装は同ディレクトリの *Pane.tsx に分離。
 */

import { useAtom } from "jotai";
import { Activity, Keyboard, Monitor, Music2 } from "lucide-react";
import { settingsOpenAtom } from "@/atoms/hotkeys";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { AudioPane } from "./AudioPane";
import { HotkeysPane } from "./HotkeysPane";
import { LastfmPane } from "./LastfmPane";
import { VisualizerPane } from "./VisualizerPane";

const NAV_ITEMS: {
	value: string;
	label: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "visualizer",
		label: "ビジュアライザー",
		icon: <Monitor className="size-4" />,
	},
	{
		value: "audio",
		label: "オーディオ解析",
		icon: <Activity className="size-4" />,
	},
	{
		value: "lastfm",
		label: "Last.fm",
		icon: <Music2 className="size-4" />,
	},
	{
		value: "hotkeys",
		label: "ショートカット",
		icon: <Keyboard className="size-4" />,
	},
];

export function SettingsDialog() {
	const [open, setOpen] = useAtom(settingsOpenAtom);
	/** sm ブレークポイント（640px）以上かどうかを監視 */
	const isSm = useMediaQuery("(min-width: 640px)");

	return (
		<Dialog open={open} onOpenChange={(v) => setOpen(v)}>
			{/*
			 * モバイル: w-[calc(100%-1rem)] max-h-[90dvh] で画面いっぱいに近い高さ
			 * デスクトップ: sm:max-w-[820px] sm:h-[80vh] sm:max-h-[660px] でワイドレイアウト
			 */}
			<DialogContent className="w-[calc(100%-1rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px))] max-h-[90dvh] h-[90dvh] sm:max-w-[820px] sm:h-[80vh] sm:max-h-[660px] flex flex-col overflow-hidden p-0 gap-0 mt-4 sm:mt-0">
				<DialogHeader className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-neutral-800">
					<DialogTitle>設定</DialogTitle>
				</DialogHeader>

				<Tabs
					defaultValue="visualizer"
					orientation={isSm ? "vertical" : "horizontal"}
					className="flex flex-1 min-h-0 gap-0"
				>
					{isSm ? (
						/* デスクトップ: 縦サイドバー */
						<TabsList className="w-44 shrink-0 flex-col justify-start h-full bg-neutral-950/50 border-r border-neutral-800 rounded-none p-2 gap-0.5">
							{NAV_ITEMS.map(({ value, label, icon }) => (
								<TabsTrigger
									key={value}
									value={value}
									className="w-full justify-start gap-2 px-3 py-2 text-xs h-auto rounded-md"
								>
									{icon}
									<span className="leading-none">{label}</span>
								</TabsTrigger>
							))}
						</TabsList>
					) : (
						/* モバイル: 横ナビゲーションバー（line variant） */
						<TabsList
							variant="line"
							className="shrink-0 flex-row flex-nowrap overflow-x-auto overflow-y-hidden w-full h-auto px-2 py-0 border-b border-neutral-800 rounded-none bg-transparent gap-0 justify-start"
						>
							{NAV_ITEMS.map(({ value, label, icon }) => (
								<TabsTrigger
									key={value}
									value={value}
									className="shrink-0 gap-1.5 px-3 py-2.5 text-xs h-auto"
								>
									{icon}
									<span className="leading-none">{label}</span>
								</TabsTrigger>
							))}
						</TabsList>
					)}

					{/* コンテンツエリア */}
					<div className="flex-1 min-w-0 min-h-0 overflow-y-auto px-4 sm:px-5 py-4">
						<TabsContent value="visualizer">
							<VisualizerPane />
						</TabsContent>
						<TabsContent value="audio">
							<AudioPane />
						</TabsContent>
						<TabsContent value="lastfm">
							<LastfmPane />
						</TabsContent>
						<TabsContent value="hotkeys">
							<HotkeysPane />
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
