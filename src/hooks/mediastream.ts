import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { audioMotionAnalyzerAtom, mediaStreamAtom } from "../atoms/audio";
import { currentSrcAtom, isPlayingAtom } from "../atoms/player";
import { useRef } from "react";

export function useMediaStream() {
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const [mediaStream, setMediaStream] = useAtom(mediaStreamAtom);
	const setIsPlaying = useSetAtom(isPlayingAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);
	/** AUX 接続時に追加した gainNode の参照。disconnect() で選択的に切り離すために保持 */
	const auxGainNodeRef = useRef<GainNode | null>(null);

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
		// sharedAudioElement からの出力をミュートして MediaStream 入力のみを聞かせる
		audioMotionAnalyzer.volume = 0;
		audioMotionAnalyzer.connectInput(gainNode);
		auxGainNodeRef.current = gainNode;
		audioMotionAnalyzer.start();
		setMediaStream(stream);
		setCurrentSrc("aux");
		setIsPlaying(true);
	};

	const disconnect = () => {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
		}

		// 追加した gainNode だけを選択的に切り離す
		// (disconnectInput() 引数なしは sharedAudioElement の MediaElementSourceNode も
		//  消してしまい、以降ファイル/ラジオモードでも analyzer に音声が届かなくなる)
		if (auxGainNodeRef.current) {
			audioMotionAnalyzer.disconnectInput(auxGainNodeRef.current);
			auxGainNodeRef.current = null;
		}
		// ファイル/ラジオモードの音声が出るよう volume を戻す
		audioMotionAnalyzer.volume = 1;
		audioMotionAnalyzer.stop();
		setMediaStream(null);
		setCurrentSrc("off");
		setIsPlaying(false);
	};

	return { connect, disconnect };
}