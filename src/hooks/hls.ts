import Hls from "hls.js";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
	audioElementAtom,
	audioMotionAnalyzerAtom,
	connectAudioSource,
	safariVizBridge,
} from "@/atoms/audio";
import { hlsAtom } from "@/atoms/hls";
import { isPlayingAtom } from "@/atoms/player";

export function useHLS() {
	const [hls, setHls] = useAtom(hlsAtom);
	const audioElement = useAtomValue(audioElementAtom);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const setIsPlaying = useSetAtom(isPlayingAtom);

	const load = useCallback(
		(source: string) => {
			// AudioContext.resume() はユーザージェスチャーの同期コールスタック上で
			// 呼ぶ必要がある。MEDIA_ATTACHED コールバックや .then() チェーン内で
			// 呼ぶとブラウザのジェスチャー要件を満たせないため、load() 先頭で即時呼ぶ。
			// radiko の場合は useSelectRadio / playRadio でも呼ばれるため冗長だが、
			// radiru（load が同期呼び出し）のカバーと防御的コーディングを兼ねる。
			void audioMotionAnalyzer.audioCtx.resume();

			if (Hls.isSupported()) {
				const newHls = new Hls({ preferManagedMediaSource: false });

				// Safari MECSN バグ回避: fMP4 セグメントを横取りしてアナライザーに流す
				safariVizBridge?.attach(newHls);

				// attach 完了後に自動再生（resume は load() 先頭で既に呼んでいる）
				newHls.on(Hls.Events.MEDIA_ATTACHED, () => {
					void audioElement
						.play()
						.then(async () => {
							// MEDIA_ATTACHED は非同期コールバックのため load() 先頭の
							// resume() が未完了の場合がある。Safari では AudioContext が
							// まだ suspended のまま start() すると無音になるため再確認する。
							if (audioMotionAnalyzer.audioCtx.state !== "running") {
								await audioMotionAnalyzer.audioCtx.resume();
							}
							connectAudioSource();
							audioMotionAnalyzer.start();
							setIsPlaying(true);
						})
						.catch((err: unknown) => {
							console.warn("[hls] HLS.js play() failed:", err);
						});
				});
				newHls.loadSource(source);
				newHls.attachMedia(audioElement);
				setHls(newHls);
				return;
			}

			// HLS 非対応ブラウザ（Safari のネイティブ HLS）
			// load() 先頭の resume() は fire-and-forget のため、play() の .then() が
			// 発火したタイミングで AudioContext がまだ suspended の場合がある。
			// Hls.js パスと同様に state を再確認して start() する。
			audioElement.src = source;
			void audioElement
				.play()
				.then(async () => {
					if (audioMotionAnalyzer.audioCtx.state !== "running") {
						await audioMotionAnalyzer.audioCtx.resume();
					}
					connectAudioSource();
					audioMotionAnalyzer.start();
					setIsPlaying(true);
				})
				.catch((err: unknown) => {
					// Safari で autoplay policy や interruption により再生が拒否された場合
					// ここに来る。サイレントに握り潰さずコンソールに出力する。
					console.warn("[hls] Safari native HLS play failed:", err);
				});
		},
		// hls は deps に含めない：常に新規インスタンスを生成するため
		[audioElement, audioMotionAnalyzer, setIsPlaying, setHls],
	);

	const unLoad = useCallback(() => {
		// Safari ブリッジのリスナーを hls.destroy() 前に解除する
		safariVizBridge?.detach();

		if (hls) {
			// destroy() は全イベントリスナー、バッファリング、MediaSource を一括クリーンアップする
			hls.destroy();
			setHls(null);
			// destroy 後に残る blob: MediaSource URL をクリアして
			// ファイルプレイヤーが src を切り替えできる状態にする
			audioElement.removeAttribute("src");
			audioElement.load();
		} else {
			// ネイティブ HLS またはセッションなし—一時停止のみ
			audioElement.pause();
		}
		audioMotionAnalyzer.stop();
		setIsPlaying(false);
	}, [hls, audioElement, audioMotionAnalyzer, setIsPlaying, setHls]);

	return { load, unLoad };
}
