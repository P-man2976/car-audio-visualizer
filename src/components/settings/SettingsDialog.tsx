/**
 * 設定ダイアログ（ペーン型）
 *
 * 左サイドバーでカテゴリを選択し、右ペインで各設定を表示する。
 * カテゴリ:
 *   - ビジュアライザー  : 実際の外観プレビューカード付き選択
 *   - オーディオ解析    : audioMotionAnalyzer の FFT・帯域・フィルター設定
 *   - Last.fm           : Last.fm OAuth 連携
 *   - ショートカット    : キーボードショートカット割り当て
 */

import { useAtom } from "jotai";
import {
	Activity,
	Keyboard,
	LogOut,
	Monitor,
	Music2,
	RotateCcw,
} from "lucide-react";
import { type KeyboardEvent, useCallback, useId, useState } from "react";
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
	DEFAULT_HOTKEY_BINDINGS,
	displayKey,
	HOTKEY_ACTION_LABELS,
	HOTKEY_ACTION_SECTIONS,
	type HotkeyAction,
	type HotkeyBindings,
	hotkeyBindingsAtom,
	normalizeKey,
	settingsOpenAtom,
} from "@/atoms/hotkeys";
import { lastfmSessionAtom } from "@/atoms/lastfm";
import { type VisualizerStyle, visualizerStyleAtom } from "@/atoms/visualizer";
import {
	type AnimationMode,
	animationModeAtom,
	steppedFallSpeedAtom,
	steppedIntervalAtom,
} from "@/atoms/visualizerAnimation";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// ─── Visualizer Preview Images ────────────────────────────────────────────────

/** ビジュアライザーのスクリーンショットプレビュー画像パス */
const VISUALIZER_PREVIEW_IMAGES: Record<VisualizerStyle, string> = {
	standard: "/visualizer/standard.png",
	dpx5021m: "/visualizer/dpx5021m.png",
	"standard-2d": "/visualizer/standard-2d.png",
};

// ─── VisualiserCard items ─────────────────────────────────────────────────────

const VISUALIZER_ITEMS: {
	value: VisualizerStyle;
	label: string;
	description: string;
}[] = [
	{
		value: "standard",
		label: "スタンダード（3D）",
		description:
			"React Three Fiber + InstancedMesh による 3D 傾斜マトリクス表示。1/3 オクターブ 9 バンド × 32 行のセルがパースペクティブ投影で描画される。",
	},
	{
		value: "dpx5021m",
		label: "DPX-5021M（Kenwood）",
		description:
			"Kenwood DPX-5021M を模したフラットスペクトラムアナライザー。メイン + サブの 2 チャンネルで表示される。",
	},
	{
		value: "standard-2d",
		label: "スタンダード（2D）",
		description:
			"PixiJS による 2D キャンバス描画。3D レンダリングなしで描画されるため低スペック環境でも動作が軽い。",
	},
];

// ─── SettingRow ───────────────────────────────────────────────────────────────

function SettingRow({
	label,
	description,
	htmlFor,
	children,
}: {
	label: string;
	description?: string;
	htmlFor?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
				<div className="flex flex-col gap-0.5 min-w-0">
					<label
						htmlFor={htmlFor}
						className="text-sm font-medium text-neutral-200 leading-none cursor-default"
					>
						{label}
					</label>
					{description && (
						<p className="text-xs text-neutral-500 leading-relaxed">
							{description}
						</p>
					)}
				</div>
				<div className="w-full sm:w-auto sm:shrink-0">{children}</div>
			</div>
		</div>
	);
}

function SectionHeader({ title }: { title: string }) {
	return (
		<div className="flex flex-col gap-1 pt-1">
			<span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
				{title}
			</span>
			<div className="h-px bg-neutral-800" />
		</div>
	);
}

// ─── VisualizerPane ───────────────────────────────────────────────────────────

function VisualizerPane() {
	const [style, setStyle] = useAtom(visualizerStyleAtom);
	const [animationMode, setAnimationMode] = useAtom(animationModeAtom);
	const [steppedInterval, setSteppedInterval] = useAtom(steppedIntervalAtom);
	const [steppedFallSpeed, setSteppedFallSpeed] = useAtom(steppedFallSpeedAtom);
	const modeId = useId();
	const intervalId = useId();
	const fallSpeedId = useId();

	return (
		<div className="flex flex-col gap-4">
			<p className="text-xs text-neutral-400 leading-relaxed">
				カードをクリックしてビジュアライザーのスタイルを選択してください。
				変更は即時反映されます。
			</p>
			<div className="flex flex-col gap-3">
				{VISUALIZER_ITEMS.map(({ value, label, description }) => {
					const isActive = style === value;
					return (
						<button
							key={value}
							type="button"
							onClick={() => setStyle(value)}
							className={`
								flex gap-3 rounded-lg border p-3 text-left transition-all
								${
									isActive
										? "border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-500/30"
										: "border-neutral-700 bg-neutral-900/50 hover:border-neutral-500 hover:bg-neutral-800/50"
								}
							`}
							aria-pressed={isActive}
						>
							<div className="w-20 sm:w-28 shrink-0 rounded overflow-hidden border border-neutral-700">
								<img
									src={VISUALIZER_PREVIEW_IMAGES[value]}
									alt={label}
									className="w-full h-auto object-cover aspect-square"
								/>
							</div>
							<div className="flex flex-col gap-1 min-w-0">
								<span
									className={`text-sm font-medium ${isActive ? "text-cyan-300" : "text-neutral-200"}`}
								>
									{label}
								</span>
								<p className="text-xs text-neutral-500 leading-relaxed line-clamp-3">
									{description}
								</p>
							</div>
						</button>
					);
				})}
			</div>

			<Separator />

			<SettingRow
				label="アニメーションモード"
				description="ステップモードでは一定間隔でレベルを取得し、バーが上昇・下降アニメーションします"
				htmlFor={modeId}
			>
				<select
					id={modeId}
					value={animationMode}
					onChange={(e) => setAnimationMode(e.target.value as AnimationMode)}
					className="h-9 w-full sm:w-44 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-200"
				>
					<option value="realtime">リアルタイム</option>
					<option value="stepped">ステップ</option>
				</select>
			</SettingRow>

			{animationMode === "stepped" && (
				<SettingRow
					label={`サンプリング間隔: ${steppedInterval}ms`}
					description="周波数データの取得間隔。25%で上昇、75%で下降します"
					htmlFor={intervalId}
				>
					<Slider
						id={intervalId}
						min={50}
						max={500}
						step={10}
						value={[steppedInterval]}
						onValueChange={([v]) => setSteppedInterval(v)}
						className="w-full sm:w-44"
					/>
				</SettingRow>
			)}

			{animationMode === "stepped" && (
				<SettingRow
					label={`下降速度: ${steppedFallSpeed.toFixed(1)}/s`}
					description="上昇後にバーが下降する速度（レベル/秒）。大きいほど速く下がります"
					htmlFor={fallSpeedId}
				>
					<Slider
						id={fallSpeedId}
						min={0.5}
						max={10}
						step={0.5}
						value={[steppedFallSpeed]}
						onValueChange={([v]) => setSteppedFallSpeed(v)}
						className="w-full sm:w-44"
					/>
				</SettingRow>
			)}
		</div>
	);
}

// ─── AudioPane ────────────────────────────────────────────────────────────────

function AudioPane() {
	const [settings, setSettings] = useAtom(audioMotionSettingsAtom);
	const [amFilterEnabled, setAmFilterEnabled] = useAtom(amFilterEnabledAtom);
	const [amSettings, setAmSettings] = useAtom(amFilterSettingsAtom);
	const fftId = useId();
	const weightId = useId();
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
			</div>

			{/* FFT / スムージング */}
			<div className="flex flex-col gap-3">
				<SectionHeader title="FFT / スムージング" />

				<SettingRow
					htmlFor={fftId}
					label="FFT サイズ"
					description="周波数解像度を決定します。大きいほど細かい分析ができますが CPU 負荷が増加します。"
				>
					<select
						id={fftId}
						className="w-full sm:w-auto rounded border border-neutral-700 bg-neutral-900/50 px-2 py-1 text-xs text-neutral-200 focus:border-neutral-500 focus:outline-none"
						value={settings.fftSize}
						onChange={(e) =>
							update("fftSize", Number(e.target.value) as FftSize)
						}
					>
						{FFT_SIZE_OPTIONS.map((s) => (
							<option key={s} value={s}>
								{s.toLocaleString()}
							</option>
						))}
					</select>
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
					htmlFor={weightId}
					label="フィルター"
					description="周波数ごとに重みを付けてデシベル値を補正します。A 特性が聴覚特性に最も近い。"
				>
					<select
						id={weightId}
						className="w-full sm:w-auto sm:max-w-[200px] rounded border border-neutral-700 bg-neutral-900/50 px-2 py-1 text-xs text-neutral-200 focus:border-neutral-500 focus:outline-none"
						value={settings.weightingFilter}
						onChange={(e) =>
							update("weightingFilter", e.target.value as WeightingFilter)
						}
					>
						{(Object.keys(WEIGHTING_FILTER_LABELS) as WeightingFilter[]).map(
							(f) => (
								<option key={f} value={f}>
									{WEIGHTING_FILTER_LABELS[f]}
								</option>
							),
						)}
					</select>
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

// ─── LastfmPane ───────────────────────────────────────────────────────────────

function LastfmPane() {
	const [lastfmSession, setLastfmSession] = useAtom(lastfmSessionAtom);
	const [lastfmConnecting, setLastfmConnecting] = useState(false);

	const connectLastfm = useCallback(() => {
		const callbackUrl = `${window.location.origin}/lastfm-callback`;
		const authUrl = `https://www.last.fm/api/auth/?${new URLSearchParams({
			api_key: import.meta.env.VITE_LASTFM_APIKEY,
			cb: callbackUrl,
		})}`;

		const popup = window.open(authUrl, "lastfm-auth", "width=600,height=700");
		if (!popup) {
			window.location.href = authUrl;
			return;
		}
		setLastfmConnecting(true);

		let pollClosed: ReturnType<typeof setInterval>;
		const handler = (e: MessageEvent) => {
			if (e.origin !== window.location.origin) return;
			if (!e.data || e.data.type !== "lastfm-session" || !e.data.session)
				return;
			window.removeEventListener("message", handler);
			clearInterval(pollClosed);
			setLastfmSession(e.data.session as LastfmSession);
			setLastfmConnecting(false);
		};
		window.addEventListener("message", handler);

		pollClosed = setInterval(() => {
			if (popup.closed) {
				clearInterval(pollClosed);
				window.removeEventListener("message", handler);
				setLastfmConnecting(false);
			}
		}, 500);
	}, [setLastfmSession]);

	return (
		<div className="flex flex-col gap-5">
			<p className="text-xs text-neutral-400 leading-relaxed">
				Last.fm と連携すると、再生中のトラック情報が自動的にスクロブルされます。
			</p>

			<Separator />

			<div className="flex flex-col gap-3">
				<span className="text-sm font-medium">アカウント連携</span>
				{lastfmSession ? (
					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/50 p-3">
							<div className="size-8 rounded-full bg-[#D51007]/20 flex items-center justify-center shrink-0">
								<Music2 className="size-4 text-[#D51007]" />
							</div>
							<div className="flex flex-col gap-0.5 min-w-0">
								<span className="text-sm font-medium text-neutral-100 truncate">
									{lastfmSession.name}
								</span>
								<span className="text-xs text-green-400">連携中</span>
							</div>
						</div>
						<Button
							variant="outline"
							className="border-red-900 hover:bg-red-900/20 gap-2 text-sm text-red-400 hover:text-red-300"
							onClick={() => setLastfmSession(null)}
						>
							<LogOut className="size-4" />
							連携を解除する
						</Button>
					</div>
				) : (
					<div className="flex flex-col gap-3">
						<div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3 text-xs text-neutral-400 leading-relaxed">
							Last.fm アカウントを持っていない場合は{" "}
							<a
								href="https://www.last.fm/join"
								target="_blank"
								rel="noreferrer"
								className="text-neutral-300 underline hover:text-neutral-100"
							>
								last.fm/join
							</a>{" "}
							から登録できます。
						</div>
						<Button
							className="bg-[#D51007aa] hover:bg-[#D51007dd] text-sm"
							onClick={connectLastfm}
							disabled={lastfmConnecting}
						>
							{lastfmConnecting ? "認証中…" : "Last.fm と連携する"}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

// ─── HotkeysPane ──────────────────────────────────────────────────────────────

function HotkeysPane() {
	const [bindings, setBindings] = useAtom(hotkeyBindingsAtom);
	const [capturing, setCapturing] = useState<HotkeyAction | null>(null);

	const handleKeyDown = (
		e: KeyboardEvent<HTMLButtonElement>,
		action: HotkeyAction,
	) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.key === "Escape") {
			setCapturing(null);
			return;
		}
		const key = normalizeKey(e.key);
		setBindings((prev: HotkeyBindings) => ({ ...prev, [action]: key }));
		setCapturing(null);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p className="text-xs text-neutral-400 leading-relaxed">
					キーをクリックして新しいショートカットを割り当てます。Esc
					でキャンセル。
				</p>
				<button
					type="button"
					className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors shrink-0 ml-2"
					onClick={() => {
						setBindings(DEFAULT_HOTKEY_BINDINGS);
						setCapturing(null);
					}}
				>
					<RotateCcw className="size-3" />
					リセット
				</button>
			</div>

			{HOTKEY_ACTION_SECTIONS.map((section, si) => (
				<div key={section.label} className="flex flex-col gap-1">
					{si > 0 && <div className="h-px bg-neutral-800 my-1" />}
					<span className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
						{section.label}
					</span>
					{section.actions.map((action) => (
						<div
							key={action}
							className="flex items-center justify-between py-0.5"
						>
							<span className="text-sm text-neutral-300">
								{HOTKEY_ACTION_LABELS[action]}
							</span>
							<button
								type="button"
								className={`
									min-w-20 rounded px-2 py-1 text-center text-xs font-mono transition-colors border
									${
										capturing === action
											? "border-blue-400 bg-blue-500/20 text-blue-300 animate-pulse"
											: "border-neutral-600 bg-neutral-800/50 text-neutral-200 hover:border-neutral-400"
									}
								`}
								onClick={() => setCapturing(action)}
								onKeyDown={
									capturing === action
										? (e) => handleKeyDown(e, action)
										: undefined
								}
								onBlur={() => capturing === action && setCapturing(null)}
							>
								{capturing === action
									? "キーを押して…"
									: displayKey(bindings[action] ?? "")}
							</button>
						</div>
					))}
				</div>
			))}
		</div>
	);
}

// ─── Main SettingsDialog ───────────────────────────────────────────────────────

const NAV_ITEMS: {
	value: string;
	label: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "visualizer",
		label: "ビジュアライザー",
		icon: <Monitor className="size-4" />,
	},
	{
		value: "audio",
		label: "オーディオ解析",
		icon: <Activity className="size-4" />,
	},
	{
		value: "lastfm",
		label: "Last.fm",
		icon: <Music2 className="size-4" />,
	},
	{
		value: "hotkeys",
		label: "ショートカット",
		icon: <Keyboard className="size-4" />,
	},
];

export function SettingsDialog() {
	const [open, setOpen] = useAtom(settingsOpenAtom);
	/** sm ブレークポイント（640px）以上かどうかを監視 */
	const isSm = useMediaQuery("(min-width: 640px)");

	return (
		<Dialog open={open} onOpenChange={(v) => setOpen(v)}>
			{/*
			 * モバイル: w-[calc(100%-1rem)] max-h-[90dvh] で画面いっぱいに近い高さ
			 * デスクトップ: sm:max-w-[820px] sm:h-[80vh] sm:max-h-[660px] でワイドレイアウト
			 */}
			<DialogContent className="w-[calc(100%-1rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px))] max-h-[90dvh] h-[90dvh] sm:max-w-[820px] sm:h-[80vh] sm:max-h-[660px] flex flex-col overflow-hidden p-0 gap-0 mt-4 sm:mt-0">
				<DialogHeader className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-neutral-800">
					<DialogTitle>設定</DialogTitle>
				</DialogHeader>

				<Tabs
					defaultValue="visualizer"
					orientation={isSm ? "vertical" : "horizontal"}
					className="flex flex-1 min-h-0 gap-0"
				>
					{isSm ? (
						/* デスクトップ: 縦サイドバー */
						<TabsList className="w-44 shrink-0 flex-col justify-start h-full bg-neutral-950/50 border-r border-neutral-800 rounded-none p-2 gap-0.5">
							{NAV_ITEMS.map(({ value, label, icon }) => (
								<TabsTrigger
									key={value}
									value={value}
									className="w-full justify-start gap-2 px-3 py-2 text-xs h-auto rounded-md"
								>
									{icon}
									<span className="leading-none">{label}</span>
								</TabsTrigger>
							))}
						</TabsList>
					) : (
						/* モバイル: 横ナビゲーションバー（line variant） */
						<TabsList
							variant="line"
							className="shrink-0 flex-row flex-nowrap overflow-x-auto overflow-y-hidden w-full h-auto px-2 py-0 border-b border-neutral-800 rounded-none bg-transparent gap-0 justify-start"
						>
							{NAV_ITEMS.map(({ value, label, icon }) => (
								<TabsTrigger
									key={value}
									value={value}
									className="shrink-0 gap-1.5 px-3 py-2.5 text-xs h-auto"
								>
									{icon}
									<span className="leading-none">{label}</span>
								</TabsTrigger>
							))}
						</TabsList>
					)}

					{/* コンテンツエリア */}
					<div className="flex-1 min-w-0 min-h-0 overflow-y-auto px-4 sm:px-5 py-4">
						<TabsContent value="visualizer">
							<VisualizerPane />
						</TabsContent>
						<TabsContent value="audio">
							<AudioPane />
						</TabsContent>
						<TabsContent value="lastfm">
							<LastfmPane />
						</TabsContent>
						<TabsContent value="hotkeys">
							<HotkeysPane />
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
