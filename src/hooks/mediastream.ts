import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { audioMotionAnalyzerAtom, mediaStreamAtom } from "../atoms/audio";
import { isPlayingAtom } from "../atoms/player";

export function useMediaStream() {
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const [mediaStream, setMediaStream] = useAtom(mediaStreamAtom);
	const setIsPlaying = useSetAtom(isPlayingAtom);

	const connect = async (stream: MediaStream) => {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
		}

		// Safari: AudioContext starts suspended until user gesture
		await audioMotionAnalyzer.audioCtx.resume();
		const source = audioMotionAnalyzer.audioCtx.createMediaStreamSource(stream);
		const gainNode = audioMotionAnalyzer.audioCtx.createGain();
		gainNode.gain.value = 3;

		source.connect(gainNode);
		audioMotionAnalyzer.volume = 0;
		audioMotionAnalyzer.connectInput(gainNode);
		audioMotionAnalyzer.start();
		setMediaStream(stream);
		setIsPlaying(true);
	};

	const disconnect = () => {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
		}

		audioMotionAnalyzer.stop();
		setMediaStream(null);
		setIsPlaying(false);
	};

	return { connect, disconnect };
}