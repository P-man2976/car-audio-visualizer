import { Button } from "@/components/ui/button";
import { useAtom, useAtomValue } from "jotai";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronFirst,
	ChevronLast,
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
	Shuffle,
	Square,
} from "lucide-react";
import { useMemo } from "react";
import {
	currentSongAtom,
	currentSrcAtom,
	persistedCurrentSongAtom,
	repeatModeAtom,
	shuffleAtom,
	type RepeatMode,
} from "@/atoms/player";
import { currentRadioAtom, tuningFreqAtom } from "@/atoms/radio";
import { useFilePlayer } from "@/hooks/file";
import { useMediaSession } from "@/hooks/mediaSession";
import { usePlayer } from "@/hooks/player";
import { usePiP } from "@/hooks/pip";
import { useBandToggle, useRadioPlayer } from "@/hooks/radio";
import { useAppHotkeys } from "@/hooks/hotkeys";
import { useLastfmScrobble } from "@/hooks/lastfm";
import { useRestoreState } from "@/hooks/restore";
import { MenuSheet } from "./MenuSheet";
import { QueueSheet } from "./QueueSheet";
import { ProgressSlider } from "./player/ProgressSlider";
import { SongInfo } from "./player/SongInfo";
import { SourceSheet } from "./SourceSheet";
import { SettingsDialog } from "./settings/SettingsDialog";
import { FileRestore } from "./FileRestore";

export function ControlsOverlay() {
	const currentSrc = useAtomValue(currentSrcAtom);
	const currentRadio = useAtomValue(currentRadioAtom);
	const currentSong = useAtomValue(currentSongAtom);
	const persistedSong = useAtomValue(persistedCurrentSongAtom);
	// 復元完了前は persistedSong（localStorage）をフォールバックにしてテキストメタデータを即時表示する。
	// blob URL (url / artwork) は持たないため、テキスト情報のみ先行して使用する。
	const displaySong = currentSong ?? persistedSong;
	const tuningFreq = useAtomValue(tuningFreqAtom);

	const [shuffle, setShuffle] = useAtom(shuffleAtom);
	const [repeat, setRepeat] = useAtom(repeatModeAtom);

	const { isPlaying, play, pause, next, prev } = usePlayer();
	const { playRadio, stopRadio, tune } = useRadioPlayer();
	const toggleBand = useBandToggle();
	useFilePlayer();
	const { isPiP, enterPiP, exitPiP, isSupported: isPiPSupported } = usePiP();
	useAppHotkeys({ enterPiP, exitPiP, isPiP });
	useLastfmScrobble();
	useRestoreState();

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

	// artwork は blob URL のため復元完了（currentSong が存在）後のみ表示する
	const coverSrc = currentSrc === "file" ? currentSong?.artwork : undefined;
	useMediaSession({
		title,
		artist,
		album,
		artwork: coverSrc ?? currentRadio?.logo,
	});

	return (
		<>
			<FileRestore />
			<SettingsDialog />
			<div className="absolute inset-0 flex w-full flex-col gap-2">
				{/* Header */}
				<div className="group relative flex flex-col justify-center">
					<div className="absolute inset-0 bg-linear-to-b from-gray-600/50 to-transparent opacity-50 transition-all duration-500 group-hover:opacity-100" />
					<SourceSheet>
						<Button variant={null} className="z-10 w-full">
							<ChevronDown className="size-7 scale-x-150" />
						</Button>
					</SourceSheet>
				</div>
				{/* Sidebar */}
				<div className="flex h-full items-center justify-between">
					<MenuSheet>
						<Button variant={null} className="h-full group/btn relative pr-12">
							<div className="absolute inset-0 opacity-0 from-gray-600/50 bg-[radial-gradient(80%_60%_at_left,var(--tw-gradient-from),transparent)] transition-all duration-500 group-hover/btn:opacity-100" />
							<ChevronRight className="size-7 scale-y-150" />
						</Button>
					</MenuSheet>
					<QueueSheet>
						<Button variant={null} className="h-full group/btn relative pl-12">
							<div className="absolute inset-0 opacity-0 from-gray-600/50 bg-[radial-gradient(80%_60%_at_right,var(--tw-gradient-from),transparent)] transition-all duration-500 group-hover/btn:opacity-100" />
							<ChevronLeft className="size-7 scale-y-150" />
						</Button>
					</QueueSheet>
				</div>
				{/* Footer */}
				<div className="flex flex-col gap-4 bg-linear-to-t from-gray-500/50 to-transparent px-12 pb-8 pt-16">
					<ProgressSlider />
					<div className="flex items-center gap-8">
						{/* Cover image / icon */}
						<div className="relative size-20 shrink-0 group/cover">
							<div className="size-full rounded-md shadow-lg overflow-hidden bg-gray-500/50 grid place-content-center text-2xl">
								{coverSrc ? (
									<img
										src={coverSrc}
										alt="cover"
										className="size-full object-cover"
									/>
								) : currentSrc === "radio" ? (
									<RadioTower />
								) : currentSrc === "aux" ? (
									<LogIn />
								) : currentSrc === "file" ? (
									<Music2 className="text-neutral-400" />
								) : null}
							</div>
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
						<SongInfo title={title} artist={artist} album={album} />
						{/* Control buttons */}
						<div className="ml-auto flex shrink-0 gap-2">
							{/* シャッフル (ファイルのみ) */}
							{currentSrc === "file" && (
								<Button
									size="icon-lg"
									variant="ghost"
									className={`p-2 transition-opacity ${shuffle ? "" : "opacity-30"}`}
									onClick={() => setShuffle((v) => !v)}
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
								onClick={async () => {
									if (currentSrc === "radio") {
										isPlaying ? stopRadio() : playRadio();
									} else {
										isPlaying ? pause() : await play();
									}
								}}
							>
								{currentSrc === "radio" && isPlaying ? (
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
				</div>
			</div>
		</>
	);
}
