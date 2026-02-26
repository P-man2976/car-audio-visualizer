import { useQuery } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { audioElementAtom } from "../atoms/audio";
import { barLevelsAtom } from "../atoms/visualizer";
import { fetchAndParseM3u8 } from "../services/m3u8";
import { VisualizerCanvas } from "./VisualizerCanvas";

const DEMO_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
const DEMO_M3U8_URL = "/demo.m3u8";

export function VisualizerPanel() {
	const audioElement = useAtomValue(audioElementAtom);
	const setBarLevels = useSetAtom(barLevelsAtom);
	const [enabled, setEnabled] = useState(true);
	const [isPlaying, setIsPlaying] = useState(false);

	const m3u8Query = useQuery({
		queryKey: ["demo-m3u8", DEMO_M3U8_URL],
		queryFn: () => fetchAndParseM3u8(DEMO_M3U8_URL),
		enabled: false,
	});

	useEffect(() => {
		audioElement.crossOrigin = "anonymous";
		audioElement.preload = "auto";
		audioElement.src = DEMO_AUDIO_URL;

		return () => {
			audioElement.pause();
			audioElement.src = "";
		};
	}, [audioElement]);

	useEffect(() => {
		if (!enabled){
			audioElement.pause();
			setIsPlaying(false);
			setBarLevels((current) => current.map(() => 0));
		}
	}, [audioElement, enabled, setBarLevels]);

	const onPlay = async () => {
		if (!enabled){
			return;
		}

		try {
			await audioElement.play();
			setIsPlaying(true);
		} catch {
			setIsPlaying(false);
		}
	};

	const onPause = () => {
		audioElement.pause();
		setIsPlaying(false);
	};

	const onStop = () => {
		audioElement.pause();
		audioElement.currentTime = 0;
		setIsPlaying(false);
	};

	return (
		<div className="grid gap-4">
			<Card>
				<CardContent className="grid gap-4 pt-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<Avatar>
								<AvatarFallback>AV</AvatarFallback>
							</Avatar>
							<Badge variant={enabled ? "success" : "warning"}>
								{enabled ? "Analyzer Enabled" : "Analyzer Disabled"}
							</Badge>
						</div>
						<div className="flex items-center gap-2">
							<Switch checked={enabled} onCheckedChange={setEnabled} />
							<span className="text-sm">可視化を有効化</span>
						</div>
					</div>

					<VisualizerCanvas enabled={enabled} />

					<div className="flex flex-wrap items-center gap-3">
						<Button onClick={() => void onPlay()}>再生</Button>
						<Button variant="secondary" onClick={onPause}>
							一時停止
						</Button>
						<Button variant="ghost" onClick={onStop}>
							停止
						</Button>
						<Badge variant={isPlaying ? "success" : "secondary"}>
							{isPlaying ? "Playing" : "Stopped"}
						</Badge>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>m3u8 Demo (React Query + m3u8-parser)</CardTitle>
					<CardDescription>
						非同期取得してプレイリスト情報を表示します。
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap items-center gap-3">
					<Button onClick={() => void m3u8Query.refetch()}>
						demo.m3u8 を取得
					</Button>
					{m3u8Query.isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
					{m3u8Query.data ? (
						<>
							<Badge variant="secondary">
								Segments: {m3u8Query.data.segmentCount}
							</Badge>
							<Badge variant="secondary">
								Target: {m3u8Query.data.targetDuration ?? "-"}
							</Badge>
							<Badge variant={m3u8Query.data.isLive ? "warning" : "success"}>
								{m3u8Query.data.isLive ? "LIVE" : "VOD"}
							</Badge>
						</>
					) : null}
					{m3u8Query.error ? (
						<Badge variant="destructive">{String(m3u8Query.error)}</Badge>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
