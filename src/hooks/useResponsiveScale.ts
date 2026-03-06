/**
 * Canvas ビューポート幅に基づいたレスポンシブスケール係数を返す。
 * デスクトップ 16:9 (viewport.width ≈ 308) をベースに、
 * 狭い画面では比例縮小し、広い画面（ウルトラワイドなど）では比例拡大する。
 * モバイルでは水平余白を少なくするため、スケール下限を 0.85 に設定。
 * ピンチ操作によるズーム倍率 (pinchZoomAtom) を乗算する。
 *
 * OrthographicCamera + AdaptiveZoom により viewport.width は
 * 旧 PerspectiveCamera(FOV=120, z=50) と同等のワールド単位で返るため、
 * REFERENCE_VP_WIDTH の基準値はそのまま適用できる。
 */
import { useThree } from "@react-three/fiber";
import { useAtomValue } from "jotai";
import { pinchZoomAtom } from "@/atoms/visualizerZoom";

/** Desktop 16:9 — OrthographicCamera(AdaptiveZoom) で viewport.width ≈ 308 */
const REFERENCE_VP_WIDTH = 308;
/** モバイル時のスケール下限 — 水平余白を詰めるため */
const MIN_SCALE = 0.85;
/** ウルトラワイド・高アスペクト比画面でのスケール上限 */
const MAX_SCALE = 2.0;

export function useResponsiveScale(): number {
	const vpWidth = useThree((s) => s.viewport.width);
	const pinchZoom = useAtomValue(pinchZoomAtom);
	const raw = vpWidth / REFERENCE_VP_WIDTH;
	return Math.max(Math.min(raw, MAX_SCALE), MIN_SCALE) * pinchZoom;
}
