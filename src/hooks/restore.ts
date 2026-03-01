import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { currentSrcAtom } from "@/atoms/player";
import { currentRadioAtom } from "@/atoms/radio";
import { useHLS } from "./hls";
import { useRadikoM3u8Url } from "@/services/radiko";

/**
 * ページリロード時に localStorage から復元されたラジオ再生を自動で再開するフック。
 * ControlsOverlay でマウントする（1 回だけ実行）。
 */
export function useRestoreState() {
	const currentSrc = useAtomValue(currentSrcAtom);
	const currentRadio = useAtomValue(currentRadioAtom);
	const { load } = useHLS();
	const { mutate } = useRadikoM3u8Url();
	const restoredRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: マウント時のみ1回実行（restoredRef で再実行防止済み）
	useEffect(() => {
		if (restoredRef.current) return;
		restoredRef.current = true;

		if (currentSrc === "radio" && currentRadio) {
			if (currentRadio.source === "radiko") {
				mutate(currentRadio.id, { onSuccess: (m3u8) => load(m3u8) });
			} else if (currentRadio.source === "radiru") {
				// radiru は url プロパティ保持
				load(
					(currentRadio as Extract<typeof currentRadio, { source: "radiru" }>)
						.url,
				);
			}
		}
	}, []); // マウント時のみ実行
}
