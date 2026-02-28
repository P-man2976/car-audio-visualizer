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
			if (Hls.isSupported()) {
				const newHls = new Hls();
				// attach 完了後に自動再生
				newHls.on(Hls.Events.MEDIA_ATTACHED, () => {
					void audioMotionAnalyzer.audioCtx
						.resume()
						.then(() => audioElement.play())
						.then(() => {
							audioMotionAnalyzer.start();
							setIsPlaying(true);
						})
						.catch(() => undefined);
				});
				newHls.loadSource(source);
				newHls.attachMedia(audioElement);
				setHls(newHls);
				return;
			}

			// HLS 非対応ブラウザ（Safari のネイティブ HLS）
			audioElement.src = source;
			void audioMotionAnalyzer.audioCtx
				.resume()
				.then(() => audioElement.play())
				.then(() => {
					audioMotionAnalyzer.start();
					setIsPlaying(true);
				})
				.catch(() => undefined);
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
