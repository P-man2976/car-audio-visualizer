/**
 * オーディオ関連の Jotai atom 定義。
 *
 * オーディオグラフの構築・制御ロジックは src/lib/audioGraph.ts に分離。
 * ここでは atom 定義と、既存 import パスの互換性のための re-export のみ行う。
 */
import { atom } from "jotai";
import {
	analyzerInstance,
	connectAudioSource,
	safariVizBridge,
	setAmFilterActive,
	setOutputVolume,
	sharedAudioElement,
} from "@/lib/audioGraph";

export const audioElementAtom = atom(sharedAudioElement);
export const audioMotionAnalyzerAtom = atom(analyzerInstance);
export const mediaStreamAtom = atom<MediaStream | null>(null);

export {
	connectAudioSource,
	safariVizBridge,
	setAmFilterActive,
	setOutputVolume,
};
