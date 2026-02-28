import { useAtom, useAtomValue } from "jotai";
import { useCallback } from "react";
import { audioElementAtom, audioMotionAnalyzerAtom } from "@/atoms/audio";
import {
	currentSongAtom,
	currentSrcAtom,
	isPlayingAtom,
	repeatModeAtom,
	shuffleAtom,
	songHistoryAtom,
	songQueueAtom,
} from "@/atoms/player";

export const usePlayer = () => {
	const [, setCurrentSrc] = useAtom(currentSrcAtom);
	const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
	const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
	const [songQueue, setSongQueue] = useAtom(songQueueAtom);
	const [songHistory, setSongHistory] = useAtom(songHistoryAtom);
	const audioElement = useAtomValue(audioElementAtom);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const shuffle = useAtomValue(shuffleAtom);
	const repeat = useAtomValue(repeatModeAtom);

	const play = useCallback(
		async (pos?: number) => {
			if (pos !== undefined) audioElement.currentTime = pos;
			// Safari: AudioContext starts suspended until user gesture
			await audioMotionAnalyzer.audioCtx.resume();
			await audioElement.play();
			audioMotionAnalyzer.start();
			setIsPlaying(true);
		},
		[audioElement, audioMotionAnalyzer, setIsPlaying],
	);

	const pause = useCallback(() => {
		audioElement.pause();
		audioMotionAnalyzer.stop();
		setIsPlaying(false);
	}, [audioElement, audioMotionAnalyzer, setIsPlaying]);

	const stop = useCallback(() => {
		audioElement.pause();
		setIsPlaying(false);
		setCurrentSrc("off");
	}, [audioElement, setIsPlaying, setCurrentSrc]);

	const next = useCallback(() => {
		// shuffle 時はキューからランダムに選択
		let nextSong: (typeof songQueue)[number] | undefined;
		let newQueue: typeof songQueue;
		if (shuffle && songQueue.length > 0) {
			const randomIndex = Math.floor(Math.random() * songQueue.length);
			nextSong = songQueue[randomIndex];
			newQueue = songQueue.filter((_, i) => i !== randomIndex);
		} else {
			[nextSong, ...newQueue] = songQueue;
		}

		const newHistory = currentSong
			? [...songHistory, currentSong]
			: [...songHistory];

		if (!nextSong) {
			// repeat all: 履歴全曲をキューに戻して再開
			if (repeat === "all" && newHistory.length > 0) {
				const allSongs = shuffle
					? [...newHistory].sort(() => Math.random() - 0.5)
					: [...newHistory];
				const [first, ...rest] = allSongs;
				setSongHistory([]);
				setCurrentSong(first);
				setSongQueue(rest);
			} else {
				setSongHistory(newHistory);
				stop();
			}
			return;
		}
		setSongHistory(newHistory);
		setCurrentSong(nextSong);
		setSongQueue(newQueue);
	}, [
		currentSong,
		songQueue,
		songHistory,
		shuffle,
		repeat,
		setSongHistory,
		setCurrentSong,
		setSongQueue,
		stop,
	]);

	const prev = useCallback(() => {
		const lastSong = songHistory.at(-1);
		setSongHistory((prev) => prev.slice(0, -1));
		if (currentSong) setSongQueue((prev) => [currentSong, ...prev]);
		setCurrentSong(lastSong ?? null);
	}, [currentSong, songHistory, setSongHistory, setCurrentSong, setSongQueue]);

	const skipTo = useCallback(
		(targetId: string) => {
			const targetIndex = songQueue.findIndex(({ id }) => id === targetId);
			if (targetIndex === -1) throw new Error("Target song not found");
			const [target, ...newQueue] = songQueue.slice(targetIndex);
			setSongHistory((prev) => (currentSong ? [...prev, currentSong] : prev));
			setCurrentSong(target);
			setSongQueue(newQueue);
		},
		[currentSong, songQueue, setSongHistory, setCurrentSong, setSongQueue],
	);

	return { isPlaying, play, pause, stop, next, prev, skipTo };
};
