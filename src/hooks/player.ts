import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { audioElementAtom, audioMotionAnalyzerAtom } from "@/atoms/audio";
import {
	currentSongAtom,
	currentSrcAtom,
	isPlayingAtom,
	persistedCurrentSongAtom,
	persistedSongHistoryAtom,
	persistedSongQueueAtom,
	repeatModeAtom,
	shuffleAtom,
	songHistoryAtom,
	songQueueAtom,
} from "@/atoms/player";
import { songToStub } from "@/types/player";

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
	const setPersistedCurrent = useSetAtom(persistedCurrentSongAtom);
	const setPersistedQueue = useSetAtom(persistedSongQueueAtom);
	const setPersistedHistory = useSetAtom(persistedSongHistoryAtom);

	const play = useCallback(
		async (pos?: number) => {
			if (pos !== undefined) audioElement.currentTime = pos;
			// Safari: AudioContext starts suspended until user gesture
			console.log("[player] play() before resume(), audioCtx.state:", audioMotionAnalyzer.audioCtx.state);
			await audioMotionAnalyzer.audioCtx.resume();
			console.log("[player] play() after resume(), audioCtx.state:", audioMotionAnalyzer.audioCtx.state);
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
				// Sync persisted stubs
				setPersistedCurrent(songToStub(first));
				setPersistedQueue(rest.map(songToStub));
				setPersistedHistory([]);
			} else {
				setSongHistory(newHistory);
				stop();
			}
			return;
		}
		setSongHistory(newHistory);
		setCurrentSong(nextSong);
		setSongQueue(newQueue);
		// Sync persisted stubs
		setPersistedCurrent(songToStub(nextSong));
		setPersistedQueue(newQueue.map(songToStub));
		setPersistedHistory(newHistory.map(songToStub));
	}, [
		currentSong,
		songQueue,
		songHistory,
		shuffle,
		repeat,
		setSongHistory,
		setCurrentSong,
		setSongQueue,
		setPersistedCurrent,
		setPersistedQueue,
		setPersistedHistory,
		stop,
	]);

	const prev = useCallback(() => {
		const lastSong = songHistory.at(-1);
		const newHistory = songHistory.slice(0, -1);
		setSongHistory(newHistory);
		const newQueue = currentSong ? [currentSong, ...songQueue] : songQueue;
		setSongQueue(newQueue);
		setCurrentSong(lastSong ?? null);
		// Sync persisted stubs
		if (lastSong) {
			setPersistedCurrent(songToStub(lastSong));
			setPersistedQueue(newQueue.map(songToStub));
			setPersistedHistory(newHistory.map(songToStub));
		}
	}, [
		currentSong,
		songQueue,
		songHistory,
		setSongHistory,
		setCurrentSong,
		setSongQueue,
		setPersistedCurrent,
		setPersistedQueue,
		setPersistedHistory,
	]);

	const skipTo = useCallback(
		(targetId: string) => {
			const targetIndex = songQueue.findIndex(({ id }) => id === targetId);
			if (targetIndex === -1) throw new Error("Target song not found");
			const [target, ...newQueue] = songQueue.slice(targetIndex);
			const newHistory = currentSong
				? [...songHistory, currentSong]
				: songHistory;
			setSongHistory(newHistory);
			setCurrentSong(target);
			setSongQueue(newQueue);
			// Sync persisted stubs
			setPersistedCurrent(songToStub(target));
			setPersistedQueue(newQueue.map(songToStub));
			setPersistedHistory(newHistory.map(songToStub));
		},
		[
			currentSong,
			songQueue,
			songHistory,
			setSongHistory,
			setCurrentSong,
			setSongQueue,
			setPersistedCurrent,
			setPersistedQueue,
			setPersistedHistory,
		],
	);

	return { isPlaying, play, pause, stop, next, prev, skipTo };
};
