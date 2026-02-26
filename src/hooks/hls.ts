import { audioElementAtom } from "../atoms/audio";
import { hlsAtom } from "../atoms/hls";
import Hls from "hls.js";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

export function useHLS() {
	const hls = useAtomValue(hlsAtom);
	const audioElement = useAtomValue(audioElementAtom);

	const onAttached = useCallback(() => {
		void audioElement.play().catch(() => undefined);
	}, [audioElement]);

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
			void audioElement.play().catch(() => undefined);
		},
		[hls, audioElement, onAttached, onDetached],
	);

	const unLoad = useCallback(() => {
		hls.stopLoad();
		hls.detachMedia();
		hls.off(Hls.Events.MEDIA_ATTACHED, onAttached);
		hls.off(Hls.Events.MEDIA_DETACHED, onDetached);
	}, [hls, onAttached, onDetached]);

	return { load, unLoad };
}
