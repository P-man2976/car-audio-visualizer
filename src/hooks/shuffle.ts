/**
 * シャッフルの ON/OFF を切り替えるフック。
 * ON 時: 現在のキュー順序を保存し、キューをシャッフルする。
 * OFF 時: キューが変更されていなければ元の順序に復元する。
 */
import { useAtom } from "jotai";
import { useCallback } from "react";
import {
	preShuffleQueueAtom,
	shuffleAtom,
	songQueueAtom,
} from "@/atoms/player";
import { shuffleArray } from "@/lib/shuffle";

export function useShuffleToggle() {
	const [shuffle, setShuffle] = useAtom(shuffleAtom);
	const [songQueue, setSongQueue] = useAtom(songQueueAtom);
	const [preShuffleQueue, setPreShuffleQueue] = useAtom(preShuffleQueueAtom);

	const toggle = useCallback(() => {
		if (!shuffle) {
			// ON: 現在の順序を保存してからシャッフル
			setPreShuffleQueue([...songQueue]);
			setSongQueue(shuffleArray(songQueue));
			setShuffle(true);
		} else {
			// OFF: キューが変更されていなければ元の順序に復元
			if (preShuffleQueue) {
				const currentIds = new Set(songQueue.map((s) => s.id));
				const savedIds = new Set(preShuffleQueue.map((s) => s.id));
				if (
					currentIds.size === savedIds.size &&
					[...currentIds].every((id) => savedIds.has(id))
				) {
					setSongQueue(preShuffleQueue);
				}
			}
			setPreShuffleQueue(null);
			setShuffle(false);
		}
	}, [
		shuffle,
		songQueue,
		preShuffleQueue,
		setShuffle,
		setSongQueue,
		setPreShuffleQueue,
	]);

	return { shuffle, toggle };
}
