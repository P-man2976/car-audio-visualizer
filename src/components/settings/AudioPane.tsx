import { useAtom } from "jotai";
import { RotateCcw } from "lucide-react";
import { useCallback, useId } from "react";
import {
	type AmFilterSettings,
	amFilterEnabledAtom,
	amFilterSettingsAtom,
	DEFAULT_AM_FILTER_SETTINGS,
} from "@/atoms/amFilter";
import {
	type AudioMotionSettings,
	audioMotionSettingsAtom,
	DEFAULT_AUDIO_MOTION_SETTINGS,
	FFT_SIZE_OPTIONS,
	type FftSize,
	WEIGHTING_FILTER_LABELS,
	type WeightingFilter,
} from "@/atoms/audioMotion";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { isMECSNBroken } from "@/lib/safari-viz-bridge";
import { SectionHeader, SettingRow } from "./SettingRow";

export function AudioPane() {
	const [settings, setSettings] = useAtom(audioMotionSettingsAtom);
	const [amFilterEnabled, setAmFilterEnabled] = useAtom(amFilterEnabledAtom);
	const [amSettings, setAmSettings] = useAtom(amFilterSettingsAtom);
	const smoothingId = useId();
	const peakId = useId();
	const minDbId = useId();
	const maxDbId = useId();
	const amFilterId = useId();
	const amLpfId = useId();
	const amHpfId = useId();
	const amDistId = useId();
	const amThreshId = useId();
	const amRatioId = useId();
	const amNoiseId = useId();
	const amSpkFreqId = useId();
	const amSpkGainId = useId();

	const update = useCallback(
		<K extends keyof AudioMotionSettings>(
			key: K,
			value: AudioMotionSettings[K],
		) => {
			setSettings((prev) => ({ ...prev, [key]: value }));
		},
		[setSettings],
	);

	const updateAm = useCallback(
		<K extends keyof AmFilterSettings>(key: K, value: AmFilterSettings[K]) => {
			setAmSettings((prev) => ({ ...prev, [key]: value }));
		},
		[setAmSettings],
	);

	const reset = useCallback(() => {
		setSettings(DEFAULT_AUDIO_MOTION_SETTINGS);
	}, [setSettings]);

	const resetAm = useCallback(() => {
		setAmSettings(DEFAULT_AM_FILTER_SETTINGS);
	}, [setAmSettings]);

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center justify-between">
				<p className="text-xs text-neutral-400 leading-relaxed">
					audioMotionAnalyzer のパラメーターを調整します。
					変更は再生中にリアルタイムで反映されます。
				</p>
				<button
					type="button"
					className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors shrink-0 ml-2"
					onClick={reset}
				>
					<RotateCcw className="size-3" />
					リセット
				</button>
			</div>

			{/* AM ラジオフィルタ */}
			<div className="flex flex-col gap-3">
				<SectionHeader title="AM ラジオフィルタ" />

				{isMECSNBroken() ? (
					<p className="text-xs text-neutral-500">
						Safari では AM フィルタを利用できません。Chrome / Firefox
						をご利用ください。
					</p>
				) : (
					<>
						<SettingRow
							htmlFor={amFilterId}
							label="AM 帯域制限"
							description="AM ラジオ再生時にフィルタを適用し、AM 放送風の音質にします。"
						>
							<Switch
								id={amFilterId}
								checked={amFilterEnabled}
								onCheckedChange={setAmFilterEnabled}
							/>
						</SettingRow>

						{amFilterEnabled && (
							<>
								<div className="flex items-center justify-between pt-1">
									<span className="text-[10px] text-neutral-500">
										AM フィルタ詳細設定
									</span>
									<button
										type="button"
										className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
										onClick={resetAm}
									>
										<RotateCcw className="size-2.5" />
										リセット
									</button>
								</div>

								<SettingRow
									htmlFor={amLpfId}
									label={`LPF: ${amSettings.lpfFreq.toLocaleString()} Hz`}
									description="ローパスフィルタのカットオフ。AM 帯域上限を制限します。"
								>
									<Slider
										id={amLpfId}
										className="w-full sm:w-28"
										min={1000}
										max={8000}
										step={100}
										value={[amSettings.lpfFreq]}
										onValueChange={([v]) => updateAm("lpfFreq", v)}
									/>
								</SettingRow>

								<SettingRow
									htmlFor={amHpfId}
									label={`HPF: ${amSettings.hpfFreq} Hz`}
									description="ハイパスフィルタのカットオフ。超低域をカットします。"
								>
									<Slider
										id={amHpfId}
										className="w-full sm:w-28"
										min={10}
										max={200}
										step={5}
										value={[amSettings.hpfFreq]}
										onValueChange={([v]) => updateAm("hpfFreq", v)}
									/>
								</SettingRow>

								<SettingRow
									htmlFor={amDistId}
									label={`歪み: ${amSettings.distortionAmount.toFixed(1)}`}
									description="ソフトクリッピングの強度。AM 放送特有の倍音歪みを再現します。"
								>
									<Slider
										id={amDistId}
										className="w-full sm:w-28"
										min={0}
										max={5}
										step={0.1}
										value={[amSettings.distortionAmount]}
										onValueChange={([v]) => updateAm("distortionAmount", v)}
									/>
								</SettingRow>

								<SettingRow
									htmlFor={amThreshId}
									label={`AGC 閾値: ${amSettings.compThreshold} dB`}
									description="コンプレッサーの閾値。ダイナミックレンジ圧縮の開始点です。"
								>
									<Slider
										id={amThreshId}
										className="w-full sm:w-28"
										min={-60}
										max={0}
										step={1}
										value={[amSettings.compThreshold]}
										onValueChange={([v]) => updateAm("compThreshold", v)}
									/>
								</SettingRow>

								<SettingRow
									htmlFor={amRatioId}
									label={`AGC レシオ: ${amSettings.compRatio}:1`}
									description="コンプレッサーの圧縮比。大きいほどダイナミックレンジが狭くなります。"
								>
									<Slider
										id={amRatioId}
										className="w-full sm:w-28"
										min={1}
										max={20}
										step={0.5}
										value={[amSettings.compRatio]}
										onValueChange={([v]) => updateAm("compRatio", v)}
									/>
								</SettingRow>

								<SettingRow
									htmlFor={amNoiseId}
									label={`ノイズ: ${(amSettings.noiseLevel * 100).toFixed(1)}%`}
									description="ブラウンノイズの混合量。AM 受信時の大気ノイズを再現します。"
								>
									<Slider
										id={amNoiseId}
										className="w-full sm:w-28"
										min={0}
										max={0.05}
										step={0.005}
										value={[amSettings.noiseLevel]}
										onValueChange={([v]) => updateAm("noiseLevel", v)}
									/>
								</SettingRow>

								<SettingRow
									htmlFor={amSpkFreqId}
									label={`SP 共振: ${amSettings.speakerResonanceFreq.toLocaleString()} Hz`}
									description="スピーカー共振周波数。AM ラジオの小型スピーカーの箱鳴りを再現します。"
								>
									<Slider
										id={amSpkFreqId}
										className="w-full sm:w-28"
										min={500}
										max={3000}
										step={50}
										value={[amSettings.speakerResonanceFreq]}
										onValueChange={([v]) => updateAm("speakerResonanceFreq", v)}
									/>
								</SettingRow>

								<SettingRow
									htmlFor={amSpkGainId}
									label={`SP ゲイン: ${amSettings.speakerResonanceGain} dB`}
									description="共振ピークの強さ。0 dB でバイパス。大きいほど箱鳴り感が強くなります。"
								>
									<Slider
										id={amSpkGainId}
										className="w-full sm:w-28"
										min={0}
										max={15}
										step={1}
										value={[amSettings.speakerResonanceGain]}
										onValueChange={([v]) => updateAm("speakerResonanceGain", v)}
									/>
								</SettingRow>
							</>
						)}
					</>
				)}
			</div>

			{/* FFT / スムージング */}
			<div className="flex flex-col gap-3">
				<SectionHeader title="FFT / スムージング" />

				<SettingRow
					label="FFT サイズ"
					description="周波数解像度を決定します。大きいほど細かい分析ができますが CPU 負荷が増加します。"
				>
					<Select
						value={String(settings.fftSize)}
						onValueChange={(v) => update("fftSize", Number(v) as FftSize)}
					>
						<SelectTrigger className="w-full sm:w-auto">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{FFT_SIZE_OPTIONS.map((s) => (
								<SelectItem key={s} value={String(s)}>
									{s.toLocaleString()}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingRow>

				<SettingRow
					htmlFor={smoothingId}
					label={`スムージング: ${settings.smoothingTimeConstant.toFixed(2)}`}
					description="時間軸の平滑化係数。0 = オフ（ビート感◎）、0.8〜0.9 = なめらか。"
				>
					<Slider
						id={smoothingId}
						className="w-full sm:w-28"
						min={0}
						max={0.99}
						step={0.01}
						value={[settings.smoothingTimeConstant]}
						onValueChange={([v]) =>
							v !== undefined && update("smoothingTimeConstant", v)
						}
					/>
				</SettingRow>
			</div>

			{/* デシベルレンジ */}
			<div className="flex flex-col gap-3">
				<SectionHeader title="デシベルレンジ" />

				<SettingRow
					htmlFor={minDbId}
					label={`ノイズフロア: ${settings.minDecibels} dB`}
					description="この dB 値以下の信号を無視します。大きくするとノイズが増え活性に見える。"
				>
					<Slider
						id={minDbId}
						className="w-full sm:w-28"
						min={-100}
						max={-30}
						step={1}
						value={[settings.minDecibels]}
						onValueChange={([v]) => {
							if (v !== undefined && v < settings.maxDecibels)
								update("minDecibels", v);
						}}
					/>
				</SettingRow>

				<SettingRow
					htmlFor={maxDbId}
					label={`クリッピング上限: ${settings.maxDecibels} dB`}
					description="この dB 値以上をフルスケールとみなします。小さくするとバーが高く見える。"
				>
					<Slider
						id={maxDbId}
						className="w-full sm:w-28"
						min={-60}
						max={0}
						step={1}
						value={[settings.maxDecibels]}
						onValueChange={([v]) => {
							if (v !== undefined && v > settings.minDecibels)
								update("maxDecibels", v);
						}}
					/>
				</SettingRow>
			</div>

			{/* 重み付けフィルター */}
			<div className="flex flex-col gap-3">
				<SectionHeader title="重み付けフィルター" />

				<SettingRow
					label="フィルター"
					description="周波数ごとに重みを付けてデシベル値を補正します。A 特性が聴覚特性に最も近い。"
				>
					<Select
						value={settings.weightingFilter || "none"}
						onValueChange={(v) =>
							update(
								"weightingFilter",
								(v === "none" ? "" : v) as WeightingFilter,
							)
						}
					>
						<SelectTrigger className="w-full sm:w-auto sm:max-w-[200px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(WEIGHTING_FILTER_LABELS) as WeightingFilter[]).map(
								(f) => (
									<SelectItem key={f || "none"} value={f || "none"}>
										{WEIGHTING_FILTER_LABELS[f]}
									</SelectItem>
								),
							)}
						</SelectContent>
					</Select>
				</SettingRow>
			</div>

			{/* ピーク表示 */}
			<div className="flex flex-col gap-3">
				<SectionHeader title="ピーク表示" />

				<SettingRow
					htmlFor={peakId}
					label={`落下速度: ${settings.peakFallSpeed.toFixed(3)}`}
					description="ピーク指示器が落下する速度。大きいほど素早く落下する。"
				>
					<Slider
						id={peakId}
						className="w-full sm:w-28"
						min={0.001}
						max={0.01}
						step={0.001}
						value={[settings.peakFallSpeed]}
						onValueChange={([v]) =>
							v !== undefined && update("peakFallSpeed", v)
						}
					/>
				</SettingRow>
			</div>
		</div>
	);
}
