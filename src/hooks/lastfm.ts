import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { currentSrcAtom, currentSongAtom, isPlayingAtom } from "@/atoms/player";
import { lastfmSessionAtom } from "@/atoms/lastfm";
import { updateNowPlaying, scrobble } from "@/lib/lastfm";

/**
 * Last.fm スクロブリングを担うフック。
 * - ファイル再生中の曲変更時に updateNowPlaying を送信する
 * - 30秒以上再生 or 曲の 50% 再生（最大 4 分）を超えたら scrobble を送信する
 */
export function useLastfmScrobble() {
	const session = useAtomValue(lastfmSessionAtom);
	const currentSrc = useAtomValue(currentSrcAtom);
	const currentSong = useAtomValue(currentSongAtom);
	const isPlaying = useAtomValue(isPlayingAtom);

	// スクロブル済みかどうかを曲 ID で管理
	const scrobbletRef = useRef<string | null>(null);
	// 再生開始 Unix epoch（秒）— scrobble の timestamp に使用
	const playStartRef = useRef<number | null>(null);
	// スクロブルタイマー
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimer = useCallback(() => {
		if (timerRef.current != null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	// 曲が変わったとき: NowPlaying 送信 + タイマーリセット
	useEffect(() => {
		clearTimer();

		if (!session || currentSrc !== "file" || !currentSong) return;

		const track = currentSong.title ?? currentSong.filename;
		const artist = currentSong.artists?.[0];
		if (!artist) return; // artist 不明時はスクロブルしない

		// 30秒未満の曲はスクロブル対象外
		if (currentSong.duration != null && currentSong.duration < 30) return;

		// NowPlaying を送信
		updateNowPlaying(session, {
			track,
			artist,
			album: currentSong.album,
			duration: currentSong.duration,
		}).catch(console.error);

		// スクロブルタイマーを設定（30秒 or 曲の 50%、最大 4 分）
		const scrobbleAfterMs = (() => {
			const half =
				currentSong.duration != null
					? (currentSong.duration / 2) * 1000
					: Infinity;
			const max = 4 * 60 * 1000;
			const min = 30 * 1000;
			return Math.max(min, Math.min(half, max));
		})();

		scrobbletRef.current = null;
		playStartRef.current = Math.floor(Date.now() / 1000);

		timerRef.current = setTimeout(async () => {
			if (scrobbletRef.current === currentSong.id) return; // 既にスクロブル済み
			scrobbletRef.current = currentSong.id;
			try {
				await scrobble(session, {
					track,
					artist,
					album: currentSong.album,
					duration: currentSong.duration,
					timestamp: playStartRef.current ?? undefined,
				});
			} catch (err) {
				console.error("[lastfm] scrobble failed:", err);
			}
		}, scrobbleAfterMs);

		return () => clearTimer();
	}, [currentSong, currentSrc, session, clearTimer]);

	// 一時停止中はタイマーを止める（簡易版: 実装を単純化）
	// 厳密にやるなら経過時間を蓄積する必要があるが、ここでは省略
	useEffect(() => {
		if (!isPlaying) {
			clearTimer();
		}
	}, [isPlaying, clearTimer]);
}
