/**
 * CSS メディアクエリをリアクティブに監視するフック。
 *
 * SSR 環境（Cloudflare Workers）では初回レンダー時に false を返し、
 * クライアントサイドの hydration 後に正しい値に更新される。
 */
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia(query);
		setMatches(mq.matches);

		const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [query]);

	return matches;
}
