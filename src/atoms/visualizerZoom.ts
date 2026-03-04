/**
 * ピンチズーム倍率を管理する Jotai atom。
 * Canvas 外部 (HTML) のタッチイベントで更新し、
 * R3F シーン内の useResponsiveScale で参照する。
 * localStorage に永続化される。
 */
import { atomWithStorage } from "jotai/utils";

/** ピンチズーム倍率（デフォルト 1.0、localStorage に永続化） */
export const pinchZoomAtom = atomWithStorage("pinch-zoom", 1);
