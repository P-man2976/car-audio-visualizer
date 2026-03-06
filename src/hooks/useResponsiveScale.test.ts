/**
 * useResponsiveScale フックのユニットテスト。
 * R3F の useThree と Jotai の pinchZoomAtom をモックし、
 * viewport 幅に応じたスケール計算をテストする。
 */
import { afterEach, describe, expect, test, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

let mockVpWidth = 308;
let mockPinchZoom = 1;

vi.mock("@react-three/fiber", () => ({
	useThree: (selector: (s: { viewport: { width: number } }) => number) =>
		selector({ viewport: { width: mockVpWidth } }),
}));

vi.mock("jotai", () => ({
	useAtomValue: () => mockPinchZoom,
}));

vi.mock("@/atoms/visualizerZoom", () => ({
	pinchZoomAtom: {},
}));

// テスト対象は mock 設定後に動的 import
const { useResponsiveScale } = await import("./useResponsiveScale");

afterEach(() => {
	mockVpWidth = 308;
	mockPinchZoom = 1;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useResponsiveScale", () => {
	test("16:9 デスクトップ (vpW=308) でスケール 1.0", () => {
		mockVpWidth = 308;
		expect(useResponsiveScale()).toBeCloseTo(1.0, 2);
	});

	test("狭い画面 (vpW=200) でスケール下限 0.85 にクランプ", () => {
		mockVpWidth = 200;
		// raw = 200/308 ≈ 0.649 → clamped to 0.85
		expect(useResponsiveScale()).toBeCloseTo(0.85, 2);
	});

	test("ウルトラワイド (vpW=411) でスケールが 1.0 を超える", () => {
		mockVpWidth = 411;
		// raw = 411/308 ≈ 1.334 → allowed up to MAX_SCALE
		expect(useResponsiveScale()).toBeCloseTo(1.334, 2);
	});

	test("非常に広い画面 (vpW=700) でスケール上限 2.0 にクランプ", () => {
		mockVpWidth = 700;
		// raw = 700/308 ≈ 2.273 → clamped to 2.0
		expect(useResponsiveScale()).toBeCloseTo(2.0, 2);
	});

	test("pinchZoom 0.7 でスケールが乗算される", () => {
		mockVpWidth = 308;
		mockPinchZoom = 0.7;
		expect(useResponsiveScale()).toBeCloseTo(0.7, 2);
	});

	test("pinchZoom 2.0 + ウルトラワイドで組み合わせ", () => {
		mockVpWidth = 411;
		mockPinchZoom = 2.0;
		// raw ≈ 1.334, clamped → 1.334 * 2.0 ≈ 2.669
		expect(useResponsiveScale()).toBeCloseTo(2.669, 2);
	});

	test("最小スケール = MIN_SCALE × 最小 pinchZoom で 0.425", () => {
		mockVpWidth = 50;
		mockPinchZoom = 0.5;
		// raw = 50/308 ≈ 0.162 → clamped to 0.85 × 0.5 = 0.425
		expect(useResponsiveScale()).toBeCloseTo(0.425, 2);
	});
});
