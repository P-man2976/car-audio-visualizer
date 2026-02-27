import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { audioElementAtom } from "../atoms/audio";
import { currentSrcAtom, isPlayingAtom, queueAtom } from "../atoms/player";
import { currentRadioAtom, customFrequencyAreaAtom, tuningFreqAtom } from "../atoms/radio";
import { useHLS } from "./hls";
import { useRadikoM3u8Url, useRadikoStationList } from "../services/radiko";
import { useRadioFrequencies } from "../services/radio";
import type { Radio } from "../types/radio";

/** FM バンド周波数範囲 (MHz) — 76〜99 MHz (ワイドFM含む日本の FM バンド全域) */
const FM_MIN = 76.0;
const FM_MAX = 99.0;
/** AM バンド周波数範囲 (kHz) — 531〜1602 kHz (9kHz ステップ) */
const AM_MIN = 531;
const AM_MAX = 1602;

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
	const customFreqList = useAtomValue(customFrequencyAreaAtom);
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

		const alreadyInQueue = queue.some((r) =>
			r.source === "radiko" && currentRadio.source === "radiko"
				? r.id === currentRadio.id
				: r.source === "radiru" && currentRadio.source === "radiru"
					? r.url === currentRadio.url
					: false,
		);
		if (!alreadyInQueue) {
			setQueue((current) => [currentRadio, ...current].slice(0, 20));
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

	/**
	 * 周波数でソートされた選局可能な局一覧。
	 *
	 * - customFrequencyAreaAtom に設定がある局: その 1 エントリのみ追加
	 * - AM+FM 併設局（設定なし）: AM primary + FM primary（primary:true がなければ FM は追加しない）
	 * - FM 専用局（設定なし）: FM primary（なければ index 0 の周波数）
	 */
	const tunableStations = useMemo(() => {
		if (!frequencies || !radikoStationList) return [];

		type Entry = {
			id: string;
			name: string;
			type: "AM" | "FM";
			freq: number;
			logo: string | undefined;
		};

		const entries: Entry[] = [];

		for (const station of radikoStationList) {
			const freqData = frequencies[station.id];
			if (!freqData) continue;

			const customFreq = customFreqList.find((s) => s.id === station.id);

			// ─── カスタム設定あり: その周波数 1 件のみ ───
			if (customFreq) {
				entries.push({
					id: station.id,
					name: station.name,
					type: customFreq.type,
					freq: customFreq.freq,
					logo: station.logo?.[0],
				});
				continue;
			}

			// ─── カスタム設定なし ───
			const hasAM = freqData.type === "AM";

			if (hasAM) {
				// AM エントリ（primary があれば優先、なければ index 0）
				const amArea =
					freqData.frequencies_am!.find((a) => a.primary) ??
					freqData.frequencies_am![0];
				entries.push({
					id: station.id,
					name: station.name,
					type: "AM",
					freq: amArea.frequency,
					logo: station.logo?.[0],
				});

				// AM+FM 併設局: primary:true の FM 周波数がある場合のみ FM エントリを追加
				const primaryFmArea = freqData.frequencies_fm?.find((a) => a.primary);
				if (primaryFmArea) {
					entries.push({
						id: station.id,
						name: station.name,
						type: "FM",
						freq: primaryFmArea.frequency,
						logo: station.logo?.[0],
					});
				}
			} else {
				// FM 専用局（primary があれば優先、なければ index 0）
				const fmArea =
					freqData.frequencies_fm!.find((a) => a.primary) ??
					freqData.frequencies_fm![0];
				entries.push({
					id: station.id,
					name: station.name,
					type: "FM",
					freq: fmArea.frequency,
					logo: station.logo?.[0],
				});
			}
		}

		return entries.sort((a, b) => {
			if (a.type !== b.type) return a.type === "FM" ? -1 : 1;
			return a.freq - b.freq;
		});
	}, [frequencies, radikoStationList, customFreqList]);

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
	 *
	 * - FM: 76〜99 MHz の範囲内を巡回（端で折り返し）
	 * - AM: 531〜1602 kHz の範囲内を巡回（端で折り返し）
	 * - 100ms 間隔で tuningFreqAtom を更新し、ドットマトリクスに反映
	 */
	const tune = useCallback(
		(direction: 1 | -1) => {
			if (!currentRadio || currentSrc !== "radio") return;
			const type = currentRadio.type;
			const step = type === "FM" ? 0.1 : 9;
			const bandMin = type === "FM" ? FM_MIN : AM_MIN;
			const bandMax = type === "FM" ? FM_MAX : AM_MAX;
			const bandSize = bandMax - bandMin;

			const stations = tunableStations.filter((s) => s.type === type);
			if (!stations.length) return;

			const baseFreq =
				animFreqRef.current !== 0
					? animFreqRef.current
					: (currentRadio.frequency ?? stations[0].freq);

			// 進行方向に次の局を探す（端に達したら反対側の端へ折り返し）
			let target: (typeof stations)[0] | undefined;
			if (direction === 1) {
				target = stations.find((s) => s.freq > baseFreq + step * 0.4);
				if (!target) target = stations[0]; // バンド最上部で折り返し
			} else {
				target = [...stations].reverse().find((s) => s.freq < baseFreq - step * 0.4);
				if (!target) target = stations[stations.length - 1]; // バンド最下部で折り返し
			}
			if (!target) return;

			if (tuningTimerRef.current) {
				clearInterval(tuningTimerRef.current);
				tuningTimerRef.current = null;
			}
			unLoad();

			const targetFreq = target.freq;
			const targetStation: Radio = {
				type: target.type,
				source: "radiko",
				id: target.id,
				name: target.name,
				logo: target.logo,
				frequency: target.freq,
			};

			// バンドを考慮した移動総距離（折り返しを含む）
			const rawDiff = (targetFreq - baseFreq) * direction;
			const totalDistance = rawDiff >= 0 ? rawDiff : rawDiff + bandSize;

			animFreqRef.current = baseFreq;
			let distanceTraveled = 0;

			// 100ms 間隔でバンド内を巡回しながら目標周波数へ近づく
			tuningTimerRef.current = setInterval(() => {
				distanceTraveled += step;

				if (distanceTraveled >= totalDistance - step * 0.45) {
					// アニメーション完了 → 局を選択
					clearInterval(tuningTimerRef.current!);
					tuningTimerRef.current = null;
					animFreqRef.current = 0;
					setTuningFreq(null);
					setCurrentRadio(targetStation);
				} else {
					// バンド端での折り返しを考慮した現在周波数を算出
					let curr = baseFreq + direction * distanceTraveled;
					if (curr > bandMax) curr -= bandSize;
					if (curr < bandMin) curr += bandSize;
					const rounded =
						type === "FM"
							? Math.round(curr * 10) / 10
							: Math.round(curr / 9) * 9;
					animFreqRef.current = rounded;
					setTuningFreq(rounded);
				}
			}, 100);
		},
		[currentRadio, currentSrc, tunableStations, unLoad, setCurrentRadio, setTuningFreq],
	);

	return { playRadio, stopRadio, tune };
}
