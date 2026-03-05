/**
 * AM ラジオフィルタの自動適用フック。
 *
 * currentRadioAtom, amFilterEnabledAtom, amFilterSettingsAtom を監視し、
 * AM 局再生中かつ設定が有効な場合にフィルタ（帯域制限 + 歪み + AGC +
 * ホワイトノイズ + モノラル化）を適用する。
 * HomePage など、アプリのルート近くで一度だけ使用すること。
 */
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { amFilterEnabledAtom, amFilterSettingsAtom } from "@/atoms/amFilter";
import { setAmFilterActive } from "@/atoms/audio";
import { currentRadioAtom } from "@/atoms/radio";

export function useAmFilter(): void {
	const amFilterEnabled = useAtomValue(amFilterEnabledAtom);
	const amFilterSettings = useAtomValue(amFilterSettingsAtom);
	const currentRadio = useAtomValue(currentRadioAtom);

	useEffect(() => {
		const isAm = currentRadio?.type === "AM";
		setAmFilterActive(isAm && amFilterEnabled, amFilterSettings);
	}, [currentRadio, amFilterEnabled, amFilterSettings]);
}
