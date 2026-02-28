import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { audioMotionAnalyzerAtom, mediaStreamAtom } from "@/atoms/audio";
import { currentSrcAtom, isPlayingAtom } from "@/atoms/player";

/**
 * AUX 接続時に追加した gainNode の参照。
 * モジュールレベルでインスタンス間共有することで、hotkeys など
 * 別 hook インスタンスからの connect/disconnect を整合させる。
 */
const _auxGainNodeRef: { current: GainNode | null } = { current: null };

export function useMediaStream() {
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);
	const [mediaStream, setMediaStream] = useAtom(mediaStreamAtom);
	const setIsPlaying = useSetAtom(isPlayingAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);

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
		_auxGainNodeRef.current = gainNode;
		audioMotionAnalyzer.start();
		setMediaStream(stream);
		setCurrentSrc("aux");
		setIsPlaying(true);
	};

	/**
	 * MediaStream を切断して audio ルーティングを元に戻す。
	 * currentSrcAtom の更新は呼び出し元が責任を持つ。
	 */
	const disconnect = () => {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
		}

		// 追加した gainNode だけを選択的に切り離す
		// (disconnectInput() 引数なしは sharedAudioElement の MediaElementSourceNode も
		//  消してしまい、以降ファイル/ラジオモードでも analyzer に音声が届かなくなる)
		if (_auxGainNodeRef.current) {
			audioMotionAnalyzer.disconnectInput(_auxGainNodeRef.current);
			_auxGainNodeRef.current = null;
		}
		// gainNode 切断後に stop してから volume を戻す
		// (stop より先に volume = 1 にすると切断前の音声が一瞬流れる)
		audioMotionAnalyzer.stop();
		audioMotionAnalyzer.volume = 1;
		setMediaStream(null);
		setIsPlaying(false);
	};

	return { connect, disconnect };
}
