import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { audioElementAtom, connectAudioSource } from "@/atoms/audio";
import {
	currentSongAtom,
	currentSrcAtom,
	isPlayingAtom,
	muteAtom,
	repeatModeAtom,
	volumeAtom,
} from "@/atoms/player";
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
	const mute = useAtomValue(muteAtom);
	const isPlaying = useAtomValue(isPlayingAtom);
	const repeat = useAtomValue(repeatModeAtom);
	const { play, next } = usePlayer();

	/** 再生中の最新値を effect 内から参照するための ref（effect の deps に含めない） */
	const isPlayingRef = useRef(isPlaying);
	isPlayingRef.current = isPlaying;

	const repeatRef = useRef(repeat);
	repeatRef.current = repeat;

	/** next() 直後に src 変更が来たときに自動再生するためのフラグ（ended 経由専用） */
	const autoPlayNextRef = useRef(false);

	// 音量・ミュートを audioElement に同期
	useEffect(() => {
		audioElement.volume = volume / 100;
		audioElement.muted = mute;
	}, [audioElement, volume, mute]);

	// ファイルモード: 楽曲変更時に src を差し替え、必要なら自動再生
	// isPlayingRef を使うことで「再生中にスキップ」した場合も確実に自動再生する
	// url が未生成（IDB ハイドレーション直後）の場合はスキップ
	useEffect(() => {
		if (currentSrc !== "file" || !currentSong?.url) return;
		audioElement.src = currentSong.url;
		audioElement.load();
		// audio 要素にソースが設定された後で AudioMotionAnalyzer に接続する。
		// Safari は src 設定前に createMediaElementSource() を呼ぶと無音になるため、
		// 必ず src 設定後に呼ぶ必要がある。内部ガードで二重接続は防止済み。
		connectAudioSource();
		// ended 由来フラグ OR 再生中のスキップ どちらでも自動再生
		if (autoPlayNextRef.current || isPlayingRef.current) {
			autoPlayNextRef.current = false;
			play().catch(console.error);
		}
	}, [audioElement, currentSrc, currentSong, play]); // isPlayingRef は ref なので deps 不要

	// ファイルモード: トラック終端で次曲へ自動送り
	useEffect(() => {
		const onEnded = () => {
			if (currentSrc !== "file") return;
			if (repeatRef.current === "one") {
				// 1曲リピート: src を再セットせず先頭に戻して即再生
				audioElement.currentTime = 0;
				play().catch(console.error);
				return;
			}
			autoPlayNextRef.current = true;
			next();
		};
		audioElement.addEventListener("ended", onEnded);
		return () => audioElement.removeEventListener("ended", onEnded);
	}, [audioElement, currentSrc, next, play]);

	// off / radio / aux モードへ切り替えたらオーディオ停止
	useEffect(() => {
		if (currentSrc !== "file") {
			audioElement.pause();
		}
	}, [audioElement, currentSrc]);
}
