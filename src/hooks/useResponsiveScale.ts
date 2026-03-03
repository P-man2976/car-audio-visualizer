/**
 * Canvas ビューポート幅に基づいたレスポンシブスケール係数を返す。
 * デスクトップ 16:9 (viewport.width ≈ 308) をベースに、
 * 狭い画面では比例縮小、広い画面ではスケール 1.0 に固定する。
 * モバイルでは水平余白を少なくするため、スケール下限を 0.85 に設定。
 */
import { useThree } from "@react-three/fiber";

/** Desktop 16:9 at fov=120, z=50 → 2 × tan(60°) × 50 × (16/9) ≈ 308 */
const REFERENCE_VP_WIDTH = 308;
/** モバイル時のスケール下限 — 水平余白を詰めるため */
const MIN_SCALE = 0.85;

export function useResponsiveScale(): number {
	const vpWidth = useThree((s) => s.viewport.width);
	const raw = vpWidth / REFERENCE_VP_WIDTH;
	return Math.max(Math.min(raw, 1), MIN_SCALE);
}
