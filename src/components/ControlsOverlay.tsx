import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	ChevronDown,
	ChevronFirst,
	ChevronLast,
	ChevronLeft,
	ChevronRight,
	Disc3,
	ListMusic,
	LoaderCircle,
	LogIn,
	Minus,
	Music2,
	Pause,
	PictureInPicture2,
	Play,
	Plus,
	RadioTower,
	Repeat,
	Repeat1,
	Settings,
	Shuffle,
	Square,
} from "lucide-react";
import { useMemo } from "react";
import {
	currentSongAtom,
	currentSrcAtom,
	type RepeatMode,
	repeatModeAtom,
} from "@/atoms/player";
import { settingsOpenAtom } from "@/atoms/hotkeys";
import {
	currentRadioAtom,
	radioChannelsByAreaAtom,
	tuningFreqAtom,
} from "@/atoms/radio";
import { Button } from "@/components/ui/button";
import { useFilePlayer } from "@/hooks/file";
import { useAppHotkeys } from "@/hooks/hotkeys";
import { useLastfmScrobble } from "@/hooks/lastfm";
import { useMediaSession } from "@/hooks/mediaSession";
import { usePiP } from "@/hooks/pip";
import { usePlayer } from "@/hooks/player";
import { useBandToggle, useRadioPlayer } from "@/hooks/radio";
import { useRadikoArea } from "@/services/radiko";
import { useRestoreState } from "@/hooks/restore";
import { useShuffleToggle } from "@/hooks/shuffle";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import { MenuSheet } from "./MenuSheet";
import { ChannelPresets } from "./player/ChannelPresets";
import { ProgressSlider } from "./player/ProgressSlider";
import { SongInfo } from "./player/SongInfo";
import { QueueSheet } from "./QueueSheet";
import { SourceSheet } from "./SourceSheet";
import { SettingsDialog } from "./settings/SettingsDialog";

export function ControlsOverlay() {
	const currentSrc = useAtomValue(currentSrcAtom);
	const currentRadio = useAtomValue(currentRadioAtom);
	const currentSong = useAtomValue(currentSongAtom);
	// IDB atom は非同期ハイドレーション後にメタデータ（handle 含む）を返す。
	// blob URL が未生成でもテキストメタデータは即利用可能。
	const displaySong = currentSong;
	const tuningFreq = useAtomValue(tuningFreqAtom);
	const channelsByArea = useAtomValue(radioChannelsByAreaAtom);
	const areaId = useRadikoArea();

	const { shuffle, toggle: toggleShuffle } = useShuffleToggle();
	const [repeat, setRepeat] = useAtom(repeatModeAtom);
	const setSettingsOpen = useSetAtom(settingsOpenAtom);

	const { isPlaying, play, pause, next, prev } = usePlayer();
	const { playRadio, stopRadio, tune, isRadikoLoading } = useRadioPlayer();
	const toggleBand = useBandToggle();
	useFilePlayer();
	const { isPiP, enterPiP, exitPiP, isSupported: isPiPSupported } = usePiP();
	useAppHotkeys({ enterPiP, exitPiP, isPiP });
	useLastfmScrobble();
	useRestoreState();
	const pinchRef = usePinchZoom();

	const channelNum = useMemo(() => {
		if (!areaId || !currentRadio?.frequency || tuningFreq != null) return null;
		const areaChans = channelsByArea[areaId];
		if (!areaChans) return null;
		const bandKey = currentRadio.type === "FM" ? "fm" : "am";
		const bandChans = areaChans[bandKey];
		for (let i = 1; i <= 6; i++) {
			if (bandChans[i as 1]?.freq === currentRadio.frequency) return i;
		}
		return null;
	}, [areaId, currentRadio, tuningFreq, channelsByArea]);

	const title = useMemo(() => {
		switch (currentSrc) {
			case "file":
				return displaySong?.title ?? displaySong?.filename ?? "タイトル不明";
			case "radio":
				return currentRadio?.name ?? "局未選択";
			case "aux":
				return "外部入力";
			case "off":
				return "再生停止中";
		}
	}, [currentSrc, displaySong, currentRadio]);

	const artist = useMemo(() => {
		if (currentSrc === "radio") {
			// 選局アニメーション中は tuningFreq を優先表示
			const displayFreq = tuningFreq ?? currentRadio?.frequency;
			if (displayFreq == null) return undefined;
			const type = currentRadio?.type ?? "FM";
			return type === "AM"
				? `${displayFreq}kHz`
				: `${displayFreq.toFixed(1)}MHz`;
		}
		if (currentSrc === "file") return displaySong?.artists?.join(", ");
		return undefined;
	}, [currentSrc, displaySong, currentRadio, tuningFreq]);

	const album = useMemo(() => {
		if (currentSrc === "file") return displaySong?.album;
		if (currentSrc === "radio") {
			return currentRadio?.source === "radiko"
				? "Radiko"
				: "NHKラジオ らじる★らじる";
		}
		return undefined;
	}, [currentSrc, displaySong, currentRadio]);

	const badge = useMemo(() => {
		if (channelNum == null) return undefined;
		return `${channelNum}`;
	}, [channelNum]);

	// artwork は blob URL のため復元完了（currentSong が存在）後のみ表示する
	const coverSrc = currentSrc === "file" ? currentSong?.artwork : undefined;
	useMediaSession({
		title,
		artist,
		album,
		artwork: coverSrc ?? currentRadio?.logo,
	});

	// Cover image / icon — shared between mobile top bar and desktop footer
	const coverElement = (
		<div className="size-full rounded-md shadow-lg overflow-hidden bg-gray-500/50 grid place-content-center text-2xl">
			{coverSrc ? (
				<img src={coverSrc} alt="cover" className="size-full object-cover" />
			) : currentSrc === "radio" ? (
				<RadioTower />
			) : currentSrc === "aux" ? (
				<LogIn />
			) : currentSrc === "file" ? (
				<Music2 className="text-neutral-400" />
			) : null}
		</div>
	);

	return (
		<>
			<SettingsDialog />
			<div ref={pinchRef} className="absolute inset-0 flex w-full flex-col">
				{/* Header — mobile: SongInfo + SourceSheet を統合グラデーションで一体表示 */}
				<div className="group relative flex flex-col justify-center pt-[env(safe-area-inset-top)]">
					<div className="absolute inset-0 bg-linear-to-b from-gray-600/50 to-transparent  transition-all duration-500 group-hover:opacity-100" />
					{/* Mobile song info — above SourceSheet */}
					<div className="relative z-10 flex items-center gap-3 px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-3 sm:hidden">
						<div className="relative size-14 shrink-0 group/cover">
							{coverElement}
							{isPiPSupported && (
								<button
									type="button"
									className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity rounded-md cursor-pointer"
									onClick={isPiP ? exitPiP : enterPiP}
									aria-label={isPiP ? "PiPを終了" : "PiPで表示"}
								>
									<PictureInPicture2 size={20} />
								</button>
							)}
						</div>
						<SongInfo
							title={title}
							artist={artist}
							album={album}
							badge={badge}
						/>
					</div>
					<SourceSheet>
						<Button
							variant={null}
							className="z-10 w-full hidden sm:inline-flex"
						>
							<ChevronDown className="size-7 scale-x-150" />
						</Button>
					</SourceSheet>
				</div>

				{/* Sidebar — desktop only */}
				<div className="hidden sm:flex h-full items-center justify-between">
					<MenuSheet>
						<Button
							variant={null}
							className="h-full group/btn relative pr-6 sm:pr-12 pl-[env(safe-area-inset-left)]"
						>
							<div className="absolute inset-0 opacity-0 from-gray-600/50 bg-[radial-gradient(80%_60%_at_left,var(--tw-gradient-from),transparent)] transition-all duration-500 group-hover/btn:opacity-100" />
							<ChevronRight className="size-7 scale-y-150" />
						</Button>
					</MenuSheet>
					<QueueSheet>
						<Button
							variant={null}
							className="h-full group/btn relative pl-6 sm:pl-12 pr-[env(safe-area-inset-right)]"
						>
							<div className="absolute inset-0 opacity-0 from-gray-600/50 bg-[radial-gradient(80%_60%_at_right,var(--tw-gradient-from),transparent)] transition-all duration-500 group-hover/btn:opacity-100" />
							<ChevronLeft className="size-7 scale-y-150" />
						</Button>
					</QueueSheet>
				</div>

				{/* Footer */}
				<div className="mt-auto flex flex-col gap-3 bg-linear-to-t from-gray-500/50 to-transparent px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:gap-2 sm:px-[max(2rem,env(safe-area-inset-left))] sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:pt-10 md:gap-4 md:px-[max(3rem,env(safe-area-inset-left))] md:pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-16">
					<ProgressSlider />
					<div className="flex items-center gap-3 sm:gap-5 md:gap-8">
						{/* Cover image / icon — desktop only */}
						<div className="relative hidden shrink-0 group/cover sm:block sm:size-16 md:size-20">
							{coverElement}
							{isPiPSupported && (
								<button
									type="button"
									className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity rounded-md cursor-pointer"
									onClick={isPiP ? exitPiP : enterPiP}
									aria-label={isPiP ? "PiPを終了" : "PiPで表示"}
								>
									<PictureInPicture2 size={24} />
								</button>
							)}
						</div>
						{/* SongInfo — desktop only */}
						<div className="hidden sm:flex sm:grow sm:overflow-hidden">
							<SongInfo
								title={title}
								artist={artist}
								album={album}
								badge={badge}
							/>
						</div>
						{/* Channel presets — radio mode only */}
						{currentSrc === "radio" && (
							<div className="shrink-0">
								<ChannelPresets />
							</div>
						)}
						{/* Control buttons — full-width evenly spaced on mobile, right-aligned on desktop */}
						<div className="flex w-full shrink-0 justify-evenly sm:ml-auto sm:w-auto sm:justify-start sm:gap-2">
							{/* シャッフル (ファイルのみ) */}
							{currentSrc === "file" && (
								<Button
									size="icon-lg"
									variant="ghost"
									className={`p-2 transition-opacity ${shuffle ? "" : "opacity-30"}`}
									onClick={toggleShuffle}
								>
									<Shuffle />
								</Button>
							)}
							{/* ファイル: 前のトラック / ラジオ: 周波数を下げる */}
							{/* ラジオ: FM/AM バンド切り替え */}
							{currentSrc === "radio" && (
								<Button
									size="icon-lg"
									variant="ghost"
									className="p-2 w-12 font-mono text-xs font-bold tracking-wider"
									onClick={toggleBand}
									aria-label="FM/AM バンド切り替え"
								>
									{currentRadio?.type ?? "FM"}
								</Button>
							)}
							{currentSrc === "file" && (
								<Button
									size="icon-lg"
									variant="ghost"
									className="p-2"
									onClick={prev}
								>
									<ChevronFirst />
								</Button>
							)}
							{currentSrc === "radio" && (
								<Button
									size="icon-lg"
									variant="ghost"
									className="p-2"
									onClick={() => tune(-1)}
								>
									<Minus />
								</Button>
							)}
							{/* 再生 / 一時停止（ファイル）または 再生 / 停止（ラジオ） */}
							<Button
								size="icon-lg"
								variant="ghost"
								className="p-2"
								disabled={isRadikoLoading}
								onClick={async () => {
									if (currentSrc === "radio") {
										isPlaying ? stopRadio() : playRadio();
									} else {
										isPlaying ? pause() : await play();
									}
								}}
							>
								{isRadikoLoading ? (
									<LoaderCircle className="animate-spin" />
								) : currentSrc === "radio" && isPlaying ? (
									<Square />
								) : isPlaying ? (
									<Pause />
								) : (
									<Play />
								)}
							</Button>
							{/* ファイル: 次のトラック / ラジオ: 周波数を上げる */}
							{currentSrc === "file" && (
								<Button
									size="icon-lg"
									variant="ghost"
									className="p-2"
									onClick={next}
								>
									<ChevronLast />
								</Button>
							)}
							{currentSrc === "radio" && (
								<Button
									size="icon-lg"
									variant="ghost"
									className="p-2"
									onClick={() => tune(1)}
								>
									<Plus />
								</Button>
							)}
							{/* リピート (ファイルのみ) */}
							{currentSrc === "file" && (
								<Button
									size="icon-lg"
									variant="ghost"
									className={`p-2 transition-opacity ${repeat !== "off" ? "" : "opacity-30"}`}
									onClick={() =>
										setRepeat((r: RepeatMode) =>
											r === "off" ? "one" : r === "one" ? "all" : "off",
										)
									}
								>
									{repeat === "one" ? <Repeat1 /> : <Repeat />}
								</Button>
							)}
						</div>
					</div>
					{/* Mobile: Sheet toggle buttons */}
					<div className="flex justify-evenly sm:hidden">
						<Button
							size="icon-lg"
							variant="ghost"
							className="p-2"
							onClick={() => setSettingsOpen(true)}
						>
							<Settings />
						</Button>
						<SourceSheet>
							<Button size="icon-lg" variant="ghost" className="p-2">
								<Disc3 />
							</Button>
						</SourceSheet>
						<QueueSheet>
							<Button size="icon-lg" variant="ghost" className="p-2">
								<ListMusic />
							</Button>
						</QueueSheet>
					</div>
				</div>
			</div>
		</>
	);
}
