import { useAtomCallback } from "jotai/utils";
import { useCallback, useEffect, useRef } from "react";
import { currentSrcAtom } from "@/atoms/player";
import { currentRadioAtom } from "@/atoms/radio";
import { useHLS } from "./hls";
import { useRadikoM3u8Url } from "@/services/radiko";

/**
 * ページリロード時に localStorage から復元されたラジオ再生を自動で再開するフック。
 * ControlsOverlay でマウントする（1 回だけ実行）。
 *
 * useAtomCallback でマウント時点のアトム値をストアから直接取得することで、
 * useEffect の deps 警告を回避している。
 * restoredRef ガードにより複数回実行されることはない。
 */
export function useRestoreState() {
	const { load } = useHLS();
	const { mutate } = useRadikoM3u8Url();
	const restoredRef = useRef(false);

	const tryRestore = useAtomCallback(
		useCallback(
			(get) => {
				if (restoredRef.current) return;
				restoredRef.current = true;

				const currentSrc = get(currentSrcAtom);
				const currentRadio = get(currentRadioAtom);

				if (currentSrc === "radio" && currentRadio) {
					if (currentRadio.source === "radiko") {
						mutate(currentRadio.id, { onSuccess: (m3u8) => load(m3u8) });
					} else if (currentRadio.source === "radiru") {
						// radiru は url プロパティを保持している
						load(
							(
								currentRadio as Extract<
									typeof currentRadio,
									{ source: "radiru" }
								>
							).url,
						);
					}
				}
			},
			[load, mutate],
		),
	);

	useEffect(() => {
		tryRestore();
	}, [tryRestore]);
}
