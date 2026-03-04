/**
 * AM ラジオフィルタの自動適用フック。
 *
 * currentRadioAtom と amFilterEnabledAtom を監視し、
 * AM 局再生中かつ設定が有効な場合にローパスフィルタを適用する。
 * HomePage など、アプリのルート近くで一度だけ使用すること。
 */
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { amFilterEnabledAtom } from "@/atoms/amFilter";
import { setAmFilterActive } from "@/atoms/audio";
import { currentRadioAtom } from "@/atoms/radio";

export function useAmFilter(): void {
	const amFilterEnabled = useAtomValue(amFilterEnabledAtom);
	const currentRadio = useAtomValue(currentRadioAtom);

	useEffect(() => {
		const isAm = currentRadio?.type === "AM";
		setAmFilterActive(isAm && amFilterEnabled);
	}, [currentRadio, amFilterEnabled]);
}
