import Hls from "hls.js";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { audioElementAtom, audioMotionAnalyzerAtom } from "@/atoms/audio";
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
			console.log("[hls] load() called, audioCtx.state:", audioMotionAnalyzer.audioCtx.state);
			void audioMotionAnalyzer.audioCtx.resume();

			if (Hls.isSupported()) {
				const newHls = new Hls();
				// attach 完了後に自動再生（resume は load() 先頭で既に呼んでいる）
				newHls.on(Hls.Events.MEDIA_ATTACHED, () => {
					console.log("[hls] MEDIA_ATTACHED, audioCtx.state:", audioMotionAnalyzer.audioCtx.state);
					void audioElement
						.play()
						.then(() => {
							console.log("[hls] play() resolved, audioCtx.state:", audioMotionAnalyzer.audioCtx.state);
							audioMotionAnalyzer.start();
							setIsPlaying(true);
						})
						.catch((err: unknown) => {
							console.warn("[hls] HLS.js play() failed, audioCtx.state:", audioMotionAnalyzer.audioCtx.state, err);
						});
				});
				newHls.loadSource(source);
				newHls.attachMedia(audioElement);
				setHls(newHls);
				return;
			}

			// HLS 非対応ブラウザ（Safari のネイティブ HLS）
			// Safari では AudioContext が "interrupted" になることがある。
			// resume() は interrupted / suspended どちらからも機能する（確認済）。
			console.log("[hls] native HLS path, audioCtx.state:", audioMotionAnalyzer.audioCtx.state);
			audioElement.src = source;
			void audioElement
				.play()
				.then(() => {
					console.log("[hls] native HLS play() resolved, audioCtx.state:", audioMotionAnalyzer.audioCtx.state);
					audioMotionAnalyzer.start();
					setIsPlaying(true);
				})
				.catch((err: unknown) => {
					// Safari で autoplay policy や interruption により再生が拒否された場合
					// ここに来る。サイレントに握り潰さずコンソールに出力する。
					console.warn("[hls] Safari native HLS play failed, audioCtx.state:", audioMotionAnalyzer.audioCtx.state, err);
				});
		},
		// hls は deps に含めない：常に新規インスタンスを生成するため
		[audioElement, audioMotionAnalyzer, setIsPlaying, setHls],
	);

	const unLoad = useCallback(() => {
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
		setIsPlaying(false);
	}, [hls, audioElement, setIsPlaying, setHls]);

	return { load, unLoad };
}
