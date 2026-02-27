import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { audioElementAtom } from "../atoms/audio";
import { currentSrcAtom, isPlayingAtom, queueAtom } from "../atoms/player";
import { currentRadioAtom, tuningFreqAtom } from "../atoms/radio";
import { useHLS } from "./hls";
import { useRadikoM3u8Url, useRadikoStationList } from "../services/radiko";
import { useRadioFrequencies } from "../services/radio";
import type { Radio } from "../types/radio";

/**
 * ラジオ再生に関わるすべてのロジックを集約するカスタムフック。
 * HLS ロード／アンロード、選局アニメーション（100ms 間隔）、
 * tuningFreqAtom への書き込みを担う。
 */
export function useRadioPlayer() {
	const audioElement = useAtomValue(audioElementAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const [currentRadio, setCurrentRadio] = useAtom(currentRadioAtom);
	const [queue, setQueue] = useAtom(queueAtom);
	const setIsPlaying = useSetAtom(isPlayingAtom);
	const setTuningFreq = useSetAtom(tuningFreqAtom);
	const { load, unLoad } = useHLS();
	const { mutate } = useRadikoM3u8Url();
	const { data: frequencies } = useRadioFrequencies();
	const { data: radikoStationList } = useRadikoStationList();

	const tuningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const animFreqRef = useRef<number>(0);

	// ラジオモード: HLS をロード。currentRadio が変わるたびに再ロード
	useEffect(() => {
		if (currentSrc !== "radio" || !currentRadio) return;

		if (currentRadio.source === "radiko") {
			mutate(currentRadio.id, { onSuccess: (m3u8) => load(m3u8) });
		} else if (currentRadio.source === "radiru") {
			load(currentRadio.url);
		}

		if (!queue.includes(currentRadio.name)) {
			setQueue((current) => [currentRadio.name, ...current].slice(0, 20));
		}

		return () => {
			unLoad();
		};
	}, [currentSrc, currentRadio, load, unLoad, mutate, queue, setQueue]);

	// off / aux モードへ切り替えたら HLS を即停止
	useEffect(() => {
		if (currentSrc === "off" || currentSrc === "aux") {
			unLoad();
		}
	}, [currentSrc, unLoad]);

	// ラジオ以外のモードに切り替わったら選局アニメーションをキャンセル
	useEffect(() => {
		if (currentSrc !== "radio") {
			if (tuningTimerRef.current) {
				clearInterval(tuningTimerRef.current);
				tuningTimerRef.current = null;
			}
			animFreqRef.current = 0;
			setTuningFreq(null);
		}
	}, [currentSrc, setTuningFreq]);

	// アンマウント時のクリーンアップ
	useEffect(() => {
		return () => {
			if (tuningTimerRef.current) clearInterval(tuningTimerRef.current);
		};
	}, []);

	/** 周波数でソートされた選局可能な局一覧 */
	const tunableStations = useMemo(() => {
		if (!frequencies || !radikoStationList) return [];
		return radikoStationList
			.flatMap((station) => {
				const freqData = frequencies[station.id];
				if (!freqData) return [];
				const primaryArea =
					freqData.type === "AM"
						? freqData.frequencies_am?.find((a) => a.primary)
						: freqData.frequencies_fm?.find((a) => a.primary);
				if (!primaryArea) return [];
				return [
					{
						id: station.id,
						name: station.name,
						type: freqData.type,
						freq: primaryArea.frequency,
						logo: station.logo?.[0],
					},
				];
			})
			.sort((a, b) => {
				if (a.type !== b.type) return a.type === "FM" ? -1 : 1;
				return a.freq - b.freq;
			});
	}, [frequencies, radikoStationList]);

	/** 停止中に現在局を再ロードして再生 */
	const playRadio = useCallback(() => {
		if (!currentRadio) return;
		if (currentRadio.source === "radiko") {
			mutate(currentRadio.id, { onSuccess: (m3u8) => load(m3u8) });
		} else if (currentRadio.source === "radiru") {
			load(currentRadio.url);
		}
	}, [currentRadio, mutate, load]);

	/** HLS をアンロードして停止 */
	const stopRadio = useCallback(() => {
		unLoad();
		audioElement.pause();
		setIsPlaying(false);
	}, [unLoad, audioElement, setIsPlaying]);

	/**
	 * 選局アニメーション (+1 = 周波数↑, -1 = 周波数↓)
	 * 100ms 間隔で tuningFreqAtom を更新し、ドットマトリクスにも反映させる。
	 */
	const tune = useCallback(
		(direction: 1 | -1) => {
			if (!currentRadio || currentSrc !== "radio") return;
			const type = currentRadio.type;
			const step = type === "FM" ? 0.1 : 9;
			const stations = tunableStations.filter((s) => s.type === type);
			if (!stations.length) return;

			const baseFreq =
				animFreqRef.current !== 0
					? animFreqRef.current
					: (currentRadio.frequency ?? stations[0].freq);

			let target: (typeof stations)[0] | undefined;
			if (direction === 1) {
				target = stations.find((s) => s.freq > baseFreq + step * 0.4);
				if (!target) target = stations[0];
			} else {
				target = [...stations].reverse().find((s) => s.freq < baseFreq - step * 0.4);
				if (!target) target = stations[stations.length - 1];
			}
			if (!target) return;

			if (tuningTimerRef.current) {
				clearInterval(tuningTimerRef.current);
				tuningTimerRef.current = null;
			}
			unLoad();

			animFreqRef.current = baseFreq;
			const targetFreq = target.freq;
			const targetStation: Radio = {
				type: target.type,
				source: "radiko",
				id: target.id,
				name: target.name,
				logo: target.logo,
				frequency: target.freq,
			};

			// 100ms 間隔で周波数を更新 → tuningFreqAtom 経由でドットマトリクスにも反映
			tuningTimerRef.current = setInterval(() => {
				const diff = targetFreq - animFreqRef.current;
				if (Math.abs(diff) < step * 0.45) {
					clearInterval(tuningTimerRef.current!);
					tuningTimerRef.current = null;
					animFreqRef.current = 0;
					setTuningFreq(null);
					setCurrentRadio(targetStation);
				} else {
					animFreqRef.current += direction * step;
					if (direction === 1 && animFreqRef.current > targetFreq) animFreqRef.current = targetFreq;
					if (direction === -1 && animFreqRef.current < targetFreq) animFreqRef.current = targetFreq;
					const rounded =
						type === "FM"
							? Math.round(animFreqRef.current * 10) / 10
							: Math.round(animFreqRef.current / 9) * 9;
					setTuningFreq(rounded);
				}
			}, 100);
		},
		[currentRadio, currentSrc, tunableStations, unLoad, setCurrentRadio, setTuningFreq],
	);

	return { playRadio, stopRadio, tune };
}
