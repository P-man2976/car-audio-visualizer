import type Hls from "hls.js";
import { atom } from "jotai";

/**
 * アクティブな Hls インスタンスを保持する atom。
 * null = ラジオ未再生 / アンロード済み。
 * load() で生成し、unLoad() で destroy() して null に戻す。
 * シングルトンを使い回すと detachMedia 後に残る SourceBuffer が
 * ファイル再生と競合するため、セッションごとに新規生成する。
 */
export const hlsAtom = atom<Hls | null>(null);
