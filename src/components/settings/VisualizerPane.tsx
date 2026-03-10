import { useAtom } from "jotai";
import { useId } from "react";
import {
	type AnimationMode,
	animationModeAtom,
	steppedFallSpeedAtom,
	steppedIntervalAtom,
	steppedPeakFallSpeedAtom,
	steppedPeakHoldTimeAtom,
} from "@/atoms/visualizerAnimation";
import { type VisualizerStyle, visualizerStyleAtom } from "@/atoms/visualizer";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { SettingRow } from "./SettingRow";

/** ビジュアライザーのスクリーンショットプレビュー画像パス */
const VISUALIZER_PREVIEW_IMAGES: Record<VisualizerStyle, string> = {
	standard: "/visualizer/standard.png",
	dpx5021m: "/visualizer/dpx5021m.png",
	"standard-2d": "/visualizer/standard-2d.png",
	"dpx5021m-2d": "/visualizer/dpx5021m.png",
};

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
	{
		value: "dpx5021m-2d",
		label: "DPX-5021M（2D）",
		description:
			"Kenwood DPX-5021M スタイルの PixiJS 2D 描画版。メイン + サブ + ウイングバーを 2D キャンバスで軽量に描画する。",
	},
];

export function VisualizerPane() {
	const [style, setStyle] = useAtom(visualizerStyleAtom);
	const [animationMode, setAnimationMode] = useAtom(animationModeAtom);
	const [steppedInterval, setSteppedInterval] = useAtom(steppedIntervalAtom);
	const [steppedFallSpeed, setSteppedFallSpeed] = useAtom(steppedFallSpeedAtom);
	const [steppedPeakHoldTime, setSteppedPeakHoldTime] = useAtom(
		steppedPeakHoldTimeAtom,
	);
	const [steppedPeakFallSpeed, setSteppedPeakFallSpeed] = useAtom(
		steppedPeakFallSpeedAtom,
	);
	const intervalId = useId();
	const fallSpeedId = useId();
	const peakHoldId = useId();
	const peakFallId = useId();

	return (
		<div className="flex flex-col gap-4">
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
							<div className="w-14 sm:w-20 shrink-0 rounded overflow-hidden border border-neutral-700">
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
				description={
					animationMode === "stepped"
						? "一定間隔でレベルを取得し、バーが上昇・下降アニメーションします"
						: "audioMotion-analyzer のリアルタイム値をそのまま描画します"
				}
			>
				<Select
					value={animationMode}
					onValueChange={(v) => setAnimationMode(v as AnimationMode)}
				>
					<SelectTrigger className="w-full sm:w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="realtime">リアルタイム</SelectItem>
						<SelectItem value="stepped">ステップ</SelectItem>
					</SelectContent>
				</Select>
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
						step={0.1}
						value={[steppedFallSpeed]}
						onValueChange={([v]) => setSteppedFallSpeed(v)}
						className="w-full sm:w-44"
					/>
				</SettingRow>
			)}

			{animationMode === "stepped" && (
				<SettingRow
					label={`ピークホールド: ${steppedPeakHoldTime}ms`}
					description="ピークバーが保持される時間。ホールド後に下降を開始します"
					htmlFor={peakHoldId}
				>
					<Slider
						id={peakHoldId}
						min={0}
						max={2000}
						step={50}
						value={[steppedPeakHoldTime]}
						onValueChange={([v]) => setSteppedPeakHoldTime(v)}
						className="w-full sm:w-44"
					/>
				</SettingRow>
			)}

			{animationMode === "stepped" && (
				<SettingRow
					label={`ピーク下降速度: ${steppedPeakFallSpeed.toFixed(1)}/s`}
					description="ピークバーの下降速度（レベル/秒）"
					htmlFor={peakFallId}
				>
					<Slider
						id={peakFallId}
						min={0.1}
						max={5}
						step={0.1}
						value={[steppedPeakFallSpeed]}
						onValueChange={([v]) => setSteppedPeakFallSpeed(v)}
						className="w-full sm:w-44"
					/>
				</SettingRow>
			)}
		</div>
	);
}
