import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { audioElementAtom } from "../atoms/audio";
import { currentSongAtom, currentSrcAtom, volumeAtom } from "../atoms/player";
import { usePlayer } from "./player";

/**
 * ファイル再生に関わるすべての副作用を集約するカスタムフック。
 * - 音量 / crossOrigin 同期
 * - 楽曲変更時の src 設定とオートプレイ
 * - トラック終端での自動次曲送り
 * - off / aux モード時のオーディオ停止
 */
export function useFilePlayer() {
	const audioElement = useAtomValue(audioElementAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const currentSong = useAtomValue(currentSongAtom);
	const volume = useAtomValue(volumeAtom);
	const { play, next } = usePlayer();

	/** next() 直後に src 変更が来たときに自動再生するためのフラグ */
	const autoPlayNextRef = useRef(false);

	// 音量と crossOrigin を audioElement に同期
	useEffect(() => {
		audioElement.crossOrigin = "anonymous";
		audioElement.volume = volume / 100;
	}, [audioElement, volume]);

	// ファイルモード: 楽曲変更時に src を差し替え、必要なら自動再生
	useEffect(() => {
		if (currentSrc !== "file" || !currentSong) return;
		audioElement.src = currentSong.url;
		audioElement.load();
		if (autoPlayNextRef.current) {
			autoPlayNextRef.current = false;
			play().catch(console.error);
		}
	}, [audioElement, currentSrc, currentSong, play]);

	// ファイルモード: トラック終端で次曲へ自動送り
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

	// off / aux モードへ切り替えたらオーディオ停止
	useEffect(() => {
		if (currentSrc === "off" || currentSrc === "aux") {
			audioElement.pause();
		}
	}, [audioElement, currentSrc]);
}
