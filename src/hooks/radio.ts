import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { audioMotionAnalyzerAtom } from "@/atoms/audio";
import { currentSrcAtom, queueAtom } from "@/atoms/player";
import {
	currentRadioAtom,
	customFrequencyAreaAtom,
	tuningFreqAtom,
} from "@/atoms/radio";
import { useHLS } from "./hls";
import { useRadikoM3u8Url, useRadikoStationList } from "@/services/radiko";
import { useRadioFrequencies } from "@/services/radio";
import type { Radio, RadioType } from "@/types/radio";

/** FM バンド周波数範囲 (MHz) — 76〜99 MHz (ワイドFM含む日本の FM バンド全域) */
const FM_MIN = 76.0;
const FM_MAX = 99.0;
/** AM バンド周波数範囲 (kHz) — 531〜1602 kHz (9kHz ステップ) */
const AM_MIN = 531;
const AM_MAX = 1602;

type TunableEntry = {
	id: string;
	name: string;
	type: "AM" | "FM";
	freq: number;
	logo: string | undefined;
};

/**
 * 周波数でソートされた選局可能な局一覧を返すフック。
 * useRadioPlayer と useBandToggle/チャンネルショートカットで共用する。
 */
export function useTunableStations(): TunableEntry[] {
	const customFreqList = useAtomValue(customFrequencyAreaAtom);
	const { data: frequencies } = useRadioFrequencies();
	const { data: radikoStationList } = useRadikoStationList();

	return useMemo(() => {
		if (!frequencies || !radikoStationList) return [];

		const entries: TunableEntry[] = [];

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
}

/**
 * FM/AM バンド切り替えフック。
 * キュー内の最新局を探してバンドを切り替える。なければ最初のチューナブル局へ。
 */
export function useBandToggle() {
	const currentRadio = useAtomValue(currentRadioAtom);
	const queue = useAtomValue(queueAtom);
	const tunableStations = useTunableStations();
	const selectRadio = useSelectRadio();

	return useCallback(() => {
		if (!currentRadio) return;
		const targetBand: RadioType = currentRadio.type === "FM" ? "AM" : "FM";

		// キュー内の最新局を探す
		const lastOfBand = queue.find((r) => r.type === targetBand);
		if (lastOfBand) {
			selectRadio(lastOfBand);
			return;
		}
		// なければ最初のチューナブル局へ
		const first = tunableStations.find((s) => s.type === targetBand);
		if (first) {
			selectRadio({
				type: first.type,
				source: "radiko",
				id: first.id,
				name: first.name,
				logo: first.logo,
				frequency: first.freq,
			});
		}
	}, [currentRadio, queue, tunableStations, selectRadio]);
}

/**
 * 局を選択してそのまま HLS ロードまで一気に行うフック。
 * イベントハンドラー内で直接呼ぶことで effect の二重実行問題を回避する。
 */
export function useSelectRadio() {
	const setCurrentRadio = useSetAtom(currentRadioAtom);
	const setCurrentSrc = useSetAtom(currentSrcAtom);
	const setQueue = useSetAtom(queueAtom);
	const { load, unLoad } = useHLS();
	const { mutate } = useRadikoM3u8Url();
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);

	return useCallback(
		(radio: Radio) => {
			// ユーザーインタラクション（クリック）の同期コンテキスト内で resume() を呼ぶ。
			// radiko は mutate() の onSuccess コールバック内で load() が呼ばれるため
			// ジェスチャーから切り離される。ここで先行して resume() することで
			// Safari / WebKit の autoplay policy を満たす。
			void audioMotionAnalyzer.audioCtx.resume();
			setCurrentSrc("radio");
			setCurrentRadio(radio);
			unLoad();
			if (radio.source === "radiko") {
				mutate(radio.id, { onSuccess: (m3u8) => load(m3u8) });
			} else if (radio.source === "radiru") {
				load(radio.url);
			}
			setQueue((current) => {
				const alreadyIn = current.some((r) =>
					r.source === "radiko" && radio.source === "radiko"
						? r.id === radio.id
						: r.source === "radiru" && radio.source === "radiru"
							? r.url === radio.url
							: false,
				);
				return alreadyIn ? current : [radio, ...current].slice(0, 20);
			});
		},
		[
			setCurrentSrc,
			setCurrentRadio,
			unLoad,
			mutate,
			load,
			setQueue,
			audioMotionAnalyzer,
		],
	);
}

/**
 * ラジオ再生に関わるすべてのロジックを集約するカスタムフック。
 * HLS ロード／アンロード、選局アニメーション（100ms 間隔）、
 * tuningFreqAtom への書き込みを担う。
 */
export function useRadioPlayer() {
	const currentSrc = useAtomValue(currentSrcAtom);
	const currentRadio = useAtomValue(currentRadioAtom);
	const setTuningFreq = useSetAtom(tuningFreqAtom);
	const { load, unLoad } = useHLS();
	const { mutate } = useRadikoM3u8Url();
	const tunableStations = useTunableStations();
	const selectRadio = useSelectRadio();
	const audioMotionAnalyzer = useAtomValue(audioMotionAnalyzerAtom);

	const tuningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const animFreqRef = useRef<number>(0);

	// ラジオ以外のモードへ切り替わったら HLS を即停止して選局アニメーションをキャンセル
	// file モードも含む（SourceBuffer が残るとファイル再生と競合するため）
	useEffect(() => {
		if (currentSrc !== "radio") {
			unLoad();
			if (tuningTimerRef.current) {
				clearInterval(tuningTimerRef.current);
				tuningTimerRef.current = null;
			}
			animFreqRef.current = 0;
			setTuningFreq(null);
		}
	}, [currentSrc, unLoad, setTuningFreq]);

	// アンマウント時のクリーンアップ
	useEffect(() => {
		return () => {
			if (tuningTimerRef.current) clearInterval(tuningTimerRef.current);
		};
	}, []);

	/** 停止中に現在局を再ロードして再生 */
	const playRadio = useCallback(() => {
		if (!currentRadio) return;
		// ユーザーインタラクション起点のコールバックとして resume() を同期呼び出し。
		// radiko は mutate の onSuccess で load() が実行されるため、
		// ここで先行して resume しないと Safari の autoplay policy に弾かれる。
		void audioMotionAnalyzer.audioCtx.resume();
		unLoad();
		if (currentRadio.source === "radiko") {
			mutate(currentRadio.id, { onSuccess: (m3u8) => load(m3u8) });
		} else if (currentRadio.source === "radiru") {
			load(currentRadio.url);
		}
	}, [currentRadio, mutate, load, unLoad, audioMotionAnalyzer]);

	/** HLS をアンロードして停止 */
	const stopRadio = useCallback(() => {
		unLoad();
	}, [unLoad]);

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
				target = [...stations]
					.reverse()
					.find((s) => s.freq < baseFreq - step * 0.4);
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
					selectRadio(targetStation);
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
		[
			currentRadio,
			currentSrc,
			tunableStations,
			unLoad,
			selectRadio,
			setTuningFreq,
		],
	);

	return { playRadio, stopRadio, tune };
}
