import { useAtom, useAtomValue } from "jotai";
import { audioMotionAnalyzerAtom, mediaStreamAtom } from "../atoms/audio";

export function useMediaStream() {
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const [mediaStream, setMediaStream] = useAtom(mediaStreamAtom);

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
	};

	const disconnect = () => {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
		}

		setMediaStream(null);
	};

	return { connect, disconnect };
}