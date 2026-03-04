/**
 * ピンチ操作でズーム倍率を変更するフック。
 * 指定した HTML 要素上の touch イベントを監視し、
 * 2 本指のピンチイン/アウトに応じて pinchZoomAtom を更新する。
 * zoom は MIN_ZOOM〜MAX_ZOOM の範囲にクランプされる。
 */
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { pinchZoomAtom } from "@/atoms/visualizerZoom";

/** ズーム倍率の下限 */
const MIN_ZOOM = 0.5;
/** ズーム倍率の上限 */
const MAX_ZOOM = 3.0;

/** 2 点間の距離を計算する */
function getDistance(t1: Touch, t2: Touch): number {
	const dx = t1.clientX - t2.clientX;
	const dy = t1.clientY - t2.clientY;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * ピンチズームフック。
 * 返り値の ref を対象要素に設定すると、ピンチ操作でズーム倍率が変化する。
 */
export function usePinchZoom() {
	const currentZoom = useAtomValue(pinchZoomAtom);
	const setZoom = useSetAtom(pinchZoomAtom);
	const elementRef = useRef<HTMLDivElement | null>(null);
	const initialDistRef = useRef<number | null>(null);
	const baseZoomRef = useRef(currentZoom);

	const onTouchStart = useCallback((e: TouchEvent) => {
		if (e.touches.length === 2) {
			initialDistRef.current = getDistance(e.touches[0], e.touches[1]);
		}
	}, []);

	const onTouchMove = useCallback(
		(e: TouchEvent) => {
			if (e.touches.length === 2 && initialDistRef.current !== null) {
				e.preventDefault(); // ブラウザのデフォルトピンチズームを抑制
				const currentDist = getDistance(e.touches[0], e.touches[1]);
				const scale = currentDist / initialDistRef.current;
				const newZoom = Math.min(
					Math.max(baseZoomRef.current * scale, MIN_ZOOM),
					MAX_ZOOM,
				);
				setZoom(newZoom);
			}
		},
		[setZoom],
	);

	const onTouchEnd = useCallback(() => {
		if (initialDistRef.current !== null) {
			// ピンチ操作完了 — 現在の zoom をベースに保存
			setZoom((current) => {
				baseZoomRef.current = current;
				return current;
			});
			initialDistRef.current = null;
		}
	}, [setZoom]);

	useEffect(() => {
		const el = elementRef.current;
		if (!el) return;

		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: false });
		el.addEventListener("touchend", onTouchEnd, { passive: true });
		el.addEventListener("touchcancel", onTouchEnd, { passive: true });

		return () => {
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", onTouchEnd);
			el.removeEventListener("touchcancel", onTouchEnd);
		};
	}, [onTouchStart, onTouchMove, onTouchEnd]);

	return elementRef;
}
