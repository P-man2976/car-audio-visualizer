/**
 * ピンチズーム倍率を管理する Jotai atom。
 * Canvas 外部 (HTML) のタッチイベントで更新し、
 * R3F シーン内の useResponsiveScale で参照する。
 */
import { atom } from "jotai";

/** ピンチズーム倍率（デフォルト 1.0） */
export const pinchZoomAtom = atom(1);
