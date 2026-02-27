import { Button } from "@/components/ui/button";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, LogIn, Minus, Pause, Play, Plus, RadioTower, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audioElementAtom } from "../atoms/audio";
import { currentSongAtom, currentSrcAtom, isPlayingAtom, queueAtom, volumeAtom } from "../atoms/player";
import { currentRadioAtom } from "../atoms/radio";
import { useHLS } from "../hooks/hls";
import { usePlayer } from "../hooks/player";
import { useRadikoM3u8Url, useRadikoStationList } from "../services/radiko";
import { useRadioFrequencies } from "../services/radio";
import type { Radio } from "../types/radio";
import { MenuSheet } from "./MenuSheet";
import { QueueSheet } from "./QueueSheet";
import { ProgressSlider } from "./player/ProgressSlider";
import { SongInfo } from "./player/SongInfo";
import { SourceSheet } from "./SourceSheet";

export function ControlsOverlay() {
	const audioElement = useAtomValue(audioElementAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const [currentRadio, setCurrentRadio] = useAtom(currentRadioAtom);
	const currentSong = useAtomValue(currentSongAtom);
	const volume = useAtomValue(volumeAtom);
	const [queue, setQueue] = useAtom(queueAtom);
	const setIsPlaying = useSetAtom(isPlayingAtom);
	const { isPlaying, play, pause, stop, next, prev } = usePlayer();
	const { load, unLoad } = useHLS();
	const { mutate } = useRadikoM3u8Url();
	const { data: frequencies } = useRadioFrequencies();
	const { data: radikoStationList } = useRadikoStationList();

	/** Set to true just before next() so the src effect auto-plays the incoming song */
	const autoPlayNextRef = useRef(false);

	/** ラジオ選局アニメーション中の表示周波数 (null = アニメーションなし) */
	const [tuningFreq, setTuningFreq] = useState<number | null>(null);
	const tuningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const animFreqRef = useRef<number>(0);

	useEffect(() => {
		audioElement.crossOrigin = "anonymous";
		audioElement.volume = volume / 100;
	}, [audioElement, volume]);

	// File mode: set audio src when song changes; auto-play if advancing from onEnded
	useEffect(() => {
		if (currentSrc !== "file" || !currentSong) return;
		audioElement.src = currentSong.url;
		audioElement.load();
		if (autoPlayNextRef.current) {
			autoPlayNextRef.current = false;
			play().catch(console.error);
		}
	}, [audioElement, currentSrc, currentSong, play]);

	// File mode: auto-advance at track end
	useEffect(() => {
		const onEnded = () => {
			if (currentSrc === "file") {
				autoPlayNextRef.current = true;
				next();
			}
		};
		audioElement.addEventListener("ended", onEnded);
		return () => audioElement.removeEventListener("ended", onEnded);
	}, [audioElement, currentSrc, next]);

	// Radio mode: HLS load/unload; off/aux mode: stop file and radio playback
	useEffect(() => {
		if (currentSrc === "off" || currentSrc === "aux") {
			unLoad();
			audioElement.pause();
			return;
		}

		if (currentSrc === "radio" && currentRadio) {
			if (currentRadio.source === "radiko") {
				mutate(currentRadio.id, {
					onSuccess: (m3u8) => load(m3u8),
				});
			} else if (currentRadio.source === "radiru") {
				load(currentRadio.url);
			}

			if (!queue.includes(currentRadio.name)) {
				setQueue((current) => [currentRadio.name, ...current].slice(0, 20));
			}
		}

		return () => {
			unLoad();
		};
	}, [currentSrc, currentRadio, audioElement, load, unLoad, mutate, queue, setQueue]);

	// currentSrc が radio 以外に変わったら選局アニメーションをキャンセル
	useEffect(() => {
		if (currentSrc !== "radio") {
			if (tuningTimerRef.current) {
				clearInterval(tuningTimerRef.current);
				tuningTimerRef.current = null;
			}
			animFreqRef.current = 0;
			setTuningFreq(null);
		}
	}, [currentSrc]);

	// アンマウント時に選局アニメーションをクリーンアップ
	useEffect(() => {
		return () => {
			if (tuningTimerRef.current) clearInterval(tuningTimerRef.current);
		};
	}, []);

	/** ラジオ局の周波数でソートされた一覧 */
	const tunableStations = useMemo(() => {
		if (!frequencies || !radikoStationList) return [];
		return radikoStationList
			.flatMap((station) => {
				const freqData = frequencies[station.id];
				if (!freqData) return [];
				const primaryArea =
					freqData.type === "AM"
						? freqData.frequencies_am?.find((a) => a.primary)
						: freqData.frequencies_fm?.find((a) => a.primary);
				if (!primaryArea) return [];
				return [
					{
						id: station.id,
						name: station.name,
						type: freqData.type,
						freq: primaryArea.frequency,
						logo: station.logo?.[0],
					},
				];
			})
			.sort((a, b) => {
				if (a.type !== b.type) return a.type === "FM" ? -1 : 1;
				return a.freq - b.freq;
			});
	}, [frequencies, radikoStationList]);

	/** ラジオ：停止中に再生ボタンで現在局を再ロード */
	const playRadio = useCallback(() => {
		if (!currentRadio) return;
		if (currentRadio.source === "radiko") {
			mutate(currentRadio.id, { onSuccess: (m3u8) => load(m3u8) });
		} else if (currentRadio.source === "radiru") {
			load(currentRadio.url);
		}
	}, [currentRadio, mutate, load]);

	/** ラジオ：停止（HLS をアンロードして isPlaying = false） */
	const stopRadio = useCallback(() => {
		unLoad();
		audioElement.pause();
		setIsPlaying(false);
	}, [unLoad, audioElement, setIsPlaying]);

	/** ラジオ選局 (+1 = 周波数が高い次局, -1 = 低い前局) */
	const tune = useCallback(
		(direction: 1 | -1) => {
			if (!currentRadio || currentSrc !== "radio") return;
			const type = currentRadio.type;
			const step = type === "FM" ? 0.1 : 9;
			const stations = tunableStations.filter((s) => s.type === type);
			if (!stations.length) return;

			const baseFreq =
				animFreqRef.current !== 0
					? animFreqRef.current
					: (currentRadio.frequency ?? stations[0].freq);

			// 次 / 前の局を探す（端に達したら折り返し）
			let target: (typeof stations)[0] | undefined;
			if (direction === 1) {
				target = stations.find((s) => s.freq > baseFreq + step * 0.4);
				if (!target) target = stations[0];
			} else {
				target = [...stations].reverse().find((s) => s.freq < baseFreq - step * 0.4);
				if (!target) target = stations[stations.length - 1];
			}
			if (!target) return;

			// 既存アニメーションをキャンセルし HLS を停止
			if (tuningTimerRef.current) {
				clearInterval(tuningTimerRef.current);
				tuningTimerRef.current = null;
			}
			unLoad();

			animFreqRef.current = baseFreq;
			const targetFreq = target.freq;
			const targetStation: Radio = {
				type: target.type,
				source: "radiko",
				id: target.id,
				name: target.name,
				logo: target.logo,
				frequency: target.freq,
			};

			tuningTimerRef.current = setInterval(() => {
				const diff = targetFreq - animFreqRef.current;
				if (Math.abs(diff) < step * 0.45) {
					// アニメーション完了 → 局を選択
					clearInterval(tuningTimerRef.current!);
					tuningTimerRef.current = null;
					animFreqRef.current = 0;
					setTuningFreq(null);
					setCurrentRadio(targetStation);
				} else {
					animFreqRef.current += direction * step;
					if (direction === 1 && animFreqRef.current > targetFreq) animFreqRef.current = targetFreq;
					if (direction === -1 && animFreqRef.current < targetFreq) animFreqRef.current = targetFreq;
					const rounded =
						type === "FM"
							? Math.round(animFreqRef.current * 10) / 10
							: Math.round(animFreqRef.current / 9) * 9;
					setTuningFreq(rounded);
				}
			}, 50);
		},
		[currentRadio, currentSrc, tunableStations, unLoad, setCurrentRadio],
	);

	// Dot matrix display string is updated in ProgressSlider to avoid re-renders here

	const title = useMemo(() => {
		switch (currentSrc) {
			case "file":
				return currentSong?.title ?? currentSong?.filename ?? "タイトル不明";
			case "radio":
				return currentRadio?.name ?? "局未選択";
			case "aux":
				return "外部入力";
			case "off":
				return "再生停止中";
		}
	}, [currentSrc, currentSong, currentRadio]);

	const artist = useMemo(() => {
		if (currentSrc === "radio") {
			// 選局アニメーション中は tuningFreq を優先表示
			const displayFreq = tuningFreq ?? currentRadio?.frequency;
			if (displayFreq == null) return undefined;
			const type = currentRadio?.type ?? "FM";
			return type === "AM" ? `${displayFreq}kHz` : `${displayFreq.toFixed(1)}MHz`;
		}
		if (currentSrc === "file") return currentSong?.artists?.join(", ");
		return undefined;
	}, [currentSrc, currentSong, currentRadio, tuningFreq]);

	const album = useMemo(() => {
		if (currentSrc === "file") return currentSong?.album;
		if (currentSrc === "radio") {
			return currentRadio?.source === "radiko" ? "Radiko" : "NHKラジオ らじる★らじる";
		}
		return undefined;
	}, [currentSrc, currentSong, currentRadio]);

	const coverSrc = currentSrc === "file" ? currentSong?.artwork : undefined;

	return (
		<div className="absolute inset-0 flex w-full flex-col gap-2">
			{/* Header */}
			<div className="group relative flex flex-col justify-center">
				<div className="absolute inset-0 bg-linear-to-b from-gray-600/50 to-transparent opacity-50 transition-all duration-500 group-hover:opacity-100" />
				<div className="z-10 flex w-full items-center px-2 py-1">
					<span className="truncate text-sm">{title}</span>
				</div>
				<SourceSheet>
					<Button variant={null} className="z-10 w-full">
						<ChevronDown className="scale-x-150" />
					</Button>
				</SourceSheet>
			</div>
			{/* Sidebar */}
			<div className="flex h-full items-center justify-between">
				<MenuSheet>
					<Button
						variant={null}
						className="h-full group/btn relative pr-12"
					>
						<div className="absolute inset-0 opacity-0 from-gray-600/50 bg-[radial-gradient(80%_60%_at_left,var(--tw-gradient-from),transparent)] transition-all duration-500 group-hover/btn:opacity-100" />
						<ChevronRight className="scale-y-150" />
					</Button>
				</MenuSheet>
				<QueueSheet>
					<Button
						variant={null}
						className="h-full group/btn relative pl-12"
					>
						<div className="absolute inset-0 opacity-0 from-gray-600/50 bg-[radial-gradient(80%_60%_at_right,var(--tw-gradient-from),transparent)] transition-all duration-500 group-hover/btn:opacity-100" />
						<ChevronLeft className="scale-y-150" />
					</Button>
				</QueueSheet>
			</div>
			{/* Footer */}
			<div className="flex flex-col gap-4 bg-linear-to-t from-gray-500/50 to-transparent px-12 pb-8 pt-16">
				<ProgressSlider />
				<div className="flex items-center gap-8">
					{/* Cover image / icon */}
					<div className="size-20 shrink-0 rounded-md shadow-lg overflow-hidden bg-gray-500/50 grid place-content-center text-2xl">
						{coverSrc ? (
							<img src={coverSrc} alt="cover" className="size-full object-cover" />
						) : currentSrc === "radio" ? (
							<RadioTower />
						) : currentSrc === "aux" ? (
							<LogIn />
						) : null}
					</div>
					<SongInfo title={title} artist={artist} album={album} />
					{/* Control buttons */}
					<div className="ml-auto flex shrink-0 gap-2">
						{/* ファイル: 前のトラック / ラジオ: 周波数を下げる */}
						{currentSrc === "file" && (
							<Button size="icon-lg" variant="ghost" className="p-2" onClick={prev}>
								<ChevronFirst />
							</Button>
						)}
						{currentSrc === "radio" && (
							<Button size="icon-lg" variant="ghost" className="p-2" onClick={() => tune(-1)}>
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
							{currentSrc === "radio" && isPlaying ? <Square /> : isPlaying ? <Pause /> : <Play />}
						</Button>
						{/* ファイル: 次のトラック / ラジオ: 周波数を上げる */}
						{currentSrc === "file" && (
							<Button size="icon-lg" variant="ghost" className="p-2" onClick={next}>
								<ChevronLast />
							</Button>
						)}
						{currentSrc === "radio" && (
							<Button size="icon-lg" variant="ghost" className="p-2" onClick={() => tune(1)}>
								<Plus />
							</Button>
						)}
						{/* ファイルのみ停止ボタンを表示 */}
						{currentSrc === "file" && (
							<Button size="icon-lg" variant="ghost" className="p-2" onClick={stop}>
								<Square />
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
