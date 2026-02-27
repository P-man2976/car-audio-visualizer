import { audioElementAtom, audioMotionAnalyzerAtom } from "../atoms/audio";
import { hlsAtom } from "../atoms/hls";
import Hls from "hls.js";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { isPlayingAtom } from "../atoms/player";

export function useHLS() {
	const hls = useAtomValue(hlsAtom);
	const audioElement = useAtomValue(audioElementAtom);
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const setIsPlaying = useSetAtom(isPlayingAtom);

	const onAttached = useCallback(() => {
		void audioMotionAnalyzer.audioCtx
			.resume()
			.then(() => audioElement.play())
			.then(() => {
				audioMotionAnalyzer.start();
				setIsPlaying(true);
			})
			.catch(() => undefined);
	}, [audioElement, audioMotionAnalyzer, setIsPlaying]);

	const onDetached = useCallback(() => {
		return;
	}, []);

	const load = useCallback(
		(source: string) => {
			if (Hls.isSupported()) {
				hls.on(Hls.Events.MEDIA_ATTACHED, onAttached);
				hls.on(Hls.Events.MEDIA_DETACHED, onDetached);
				hls.loadSource(source);
				hls.attachMedia(audioElement);
				return;
			}

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
		[hls, audioElement, audioMotionAnalyzer, setIsPlaying, onAttached, onDetached],
	);

	const unLoad = useCallback(() => {
		hls.stopLoad();
		hls.detachMedia();
		hls.off(Hls.Events.MEDIA_ATTACHED, onAttached);
		hls.off(Hls.Events.MEDIA_DETACHED, onDetached);
		setIsPlaying(false);
	}, [hls, onAttached, onDetached, setIsPlaying]);

	return { load, unLoad };
}
