import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { audioElementAtom, audioMotionAnalyzerAtom } from "@/atoms/audio";
import {
	currentSongAtom,
	currentSrcAtom,
	isPlayingAtom,
	preShuffleQueueAtom,
	repeatModeAtom,
	shuffleAtom,
	songHistoryAtom,
	songQueueAtom,
} from "@/atoms/player";
import { shuffleArray } from "@/lib/shuffle";

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
	const setPreShuffleQueue = useSetAtom(preShuffleQueueAtom);

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
		// キューは既にシャッフル済み（shuffleAtom ON 時）なので常に先頭から取得
		const [nextSong, ...newQueue] = songQueue;

		const newHistory = currentSong
			? [...songHistory, currentSong]
			: [...songHistory];

		if (!nextSong) {
			// repeat all: 履歴全曲をキューに戻して再開
			if (repeat === "all" && newHistory.length > 0) {
				const allSongs = shuffle ? shuffleArray(newHistory) : [...newHistory];
				const [first, ...rest] = allSongs;
				setSongHistory([]);
				setCurrentSong(first);
				setSongQueue(rest);
				// repeat-all でキューが再構成されるため preShuffleQueue は無効化
				setPreShuffleQueue(null);
			} else {
				// 全曲再生完了: currentSong をクリアして停止
				setSongHistory(newHistory);
				setCurrentSong(null);
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
		setPreShuffleQueue,
		stop,
	]);

	const prev = useCallback(() => {
		const lastSong = songHistory.at(-1);
		const newHistory = songHistory.slice(0, -1);
		setSongHistory(newHistory);
		const newQueue = currentSong ? [currentSong, ...songQueue] : songQueue;
		setSongQueue(newQueue);
		setCurrentSong(lastSong ?? null);
	}, [
		currentSong,
		songQueue,
		songHistory,
		setSongHistory,
		setCurrentSong,
		setSongQueue,
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
		},
		[
			currentSong,
			songQueue,
			songHistory,
			setSongHistory,
			setCurrentSong,
			setSongQueue,
		],
	);

	return { isPlaying, play, pause, stop, next, prev, skipTo };
};
