/**
 * Canvas ビューポート幅に基づいたレスポンシブスケール係数を返す。
 * デスクトップ 16:9 (viewport.width ≈ 308) をベースに、
 * 狭い画面では比例縮小、広い画面ではスケール 1.0 に固定する。
 */
import { useThree } from "@react-three/fiber";

/** Desktop 16:9 at fov=120, z=50 → 2 × tan(60°) × 50 × (16/9) ≈ 308 */
const REFERENCE_VP_WIDTH = 308;

export function useResponsiveScale(): number {
	const vpWidth = useThree((s) => s.viewport.width);
	return Math.min(vpWidth / REFERENCE_VP_WIDTH, 1);
}
