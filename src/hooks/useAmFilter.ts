/**
 * AM ラジオフィルタの自動適用フック。
 *
 * currentSrcAtom, currentRadioAtom, amFilterEnabledAtom, amFilterSettingsAtom を監視し、
 * ソースが "radio" かつ AM 局再生中かつ設定が有効な場合にフィルタ
 * （帯域制限 + 歪み + AGC + ブラウンノイズ + モノラル化）を適用する。
 * HomePage など、アプリのルート近くで一度だけ使用すること。
 */
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { amFilterEnabledAtom, amFilterSettingsAtom } from "@/atoms/amFilter";
import { setAmFilterActive } from "@/atoms/audio";
import { currentSrcAtom } from "@/atoms/player";
import { currentRadioAtom } from "@/atoms/radio";

export function useAmFilter(): void {
	const amFilterEnabled = useAtomValue(amFilterEnabledAtom);
	const amFilterSettings = useAtomValue(amFilterSettingsAtom);
	const currentRadio = useAtomValue(currentRadioAtom);
	const currentSrc = useAtomValue(currentSrcAtom);

	useEffect(() => {
		const isAm = currentSrc === "radio" && currentRadio?.type === "AM";
		setAmFilterActive(isAm && amFilterEnabled, amFilterSettings);
	}, [currentSrc, currentRadio, amFilterEnabled, amFilterSettings]);
}
