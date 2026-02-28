import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { audioElementAtom } from "@/atoms/audio";
import { currentSrcAtom, isPlayingAtom, progressAtom } from "@/atoms/player";
import { usePlayer } from "./player";
import { useRadioPlayer } from "./radio";

/**
 * OS のメディアコントロール（Media Session API）を管理するフック。
 * - ファイル: play / pause / nexttrack / previoustrack + position state
 * - ラジオ: play (再ロード) / pause (停止) のみ
 * - off / aux: ハンドラーを全解除
 */
export function useMediaSession({
	title,
	artist,
	album,
	artwork,
}: {
	title?: string;
	artist?: string;
	album?: string;
	artwork?: string;
}) {
	const audioElement = useAtomValue(audioElementAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const progress = useAtomValue(progressAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const { play, pause, next, prev } = usePlayer();
	const { playRadio, stopRadio } = useRadioPlayer();

	// ファイル再生時のみ position state を更新
	useEffect(() => {
		if (currentSrc !== "file") return;
		if (
			!Number.isNaN(audioElement.duration) &&
			audioElement.duration !== Infinity
		) {
			navigator.mediaSession.setPositionState({
				duration: audioElement.duration,
				playbackRate: 1,
				position: progress,
			});
		}
	}, [audioElement, progress, currentSrc]);

	// ソースに応じてアクションハンドラーを登録
	useEffect(() => {
		if (currentSrc === "file") {
			navigator.mediaSession.setActionHandler("play", async () => {
				await play();
			});
			navigator.mediaSession.setActionHandler("pause", () => {
				pause();
			});
			navigator.mediaSession.setActionHandler("nexttrack", () => next());
			navigator.mediaSession.setActionHandler("previoustrack", () => prev());
		} else if (currentSrc === "radio") {
			navigator.mediaSession.setActionHandler("play", () => {
				playRadio();
			});
			navigator.mediaSession.setActionHandler("pause", () => {
				stopRadio();
			});
			navigator.mediaSession.setActionHandler("nexttrack", null);
			navigator.mediaSession.setActionHandler("previoustrack", null);
		} else {
			navigator.mediaSession.setActionHandler("play", null);
			navigator.mediaSession.setActionHandler("pause", null);
			navigator.mediaSession.setActionHandler("nexttrack", null);
			navigator.mediaSession.setActionHandler("previoustrack", null);
		}

		return () => {
			navigator.mediaSession.playbackState = "none";
			navigator.mediaSession.setActionHandler("play", null);
			navigator.mediaSession.setActionHandler("pause", null);
			navigator.mediaSession.setActionHandler("nexttrack", null);
			navigator.mediaSession.setActionHandler("previoustrack", null);
		};
	}, [currentSrc, play, pause, next, prev, playRadio, stopRadio]);

	// 再生状態を同期
	useEffect(() => {
		navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
	}, [isPlaying]);

	// メタデータを更新
	useEffect(() => {
		navigator.mediaSession.metadata = new MediaMetadata({
			title,
			artist,
			album,
			artwork: artwork ? [{ src: artwork }] : undefined,
		});
	}, [title, artist, album, artwork]);
}
