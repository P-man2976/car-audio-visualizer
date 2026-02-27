import { useMutation, useQuery } from "@tanstack/react-query";
import { Parser as M3U8Parser } from "m3u8-parser";
import type { RadikoStation } from "../types/radio";

export function useRadikoToken() {
	return useQuery({
		queryKey: ["radio", "radiko", "token"],
		queryFn: async () => {
			const res = await fetch("/api/radiko/auth");
			if (!res.ok) {
				const { error } = await res.json() as { error: string };
				throw new Error(`[Error] Radiko auth failed: ${error}`);
			}
			return res.json() as Promise<{ authToken: string; areaId: string }>;
		},
		refetchInterval: 1000 * 60 * 8,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});
}

export function useRadikoArea() {
	const { data } = useRadikoToken();
	return data?.areaId;
}

export function useRadikoStationList(areaId?: string) {
	const area = useRadikoArea();
	const resolved = areaId ?? area;

	return useQuery({
		queryKey: ["radio", "radiko", resolved, "stations"],
		queryFn: async () => {
			const res = await fetch(`/api/radiko/v3/station/list/${resolved}.xml`);
			const xml = await res.text();
			const doc = new DOMParser().parseFromString(xml, "application/xml");
			const stationNodes = Array.from(doc.querySelectorAll("station"));

			return stationNodes.map((node) => {
				const logo = Array.from(node.querySelectorAll("logo")).map((logoNode) => logoNode.textContent ?? "");
				return {
					id: node.querySelector("id")?.textContent ?? "",
					name: node.querySelector("name")?.textContent ?? "",
					ascii_name: node.querySelector("ascii_name")?.textContent ?? "",
					ruby: node.querySelector("ruby")?.textContent ?? "",
					areafree: Number(node.querySelector("areafree")?.textContent ?? "0") as 0 | 1,
					timefree: Number(node.querySelector("timefree")?.textContent ?? "0") as 0 | 1,
					logo,
					banner: node.querySelector("banner")?.textContent ?? "",
					href: node.querySelector("href")?.textContent ?? "",
					simul_max_delay: Number(node.querySelector("simul_max_delay")?.textContent ?? "0"),
					tf_max_delay: Number(node.querySelector("tf_max_delay")?.textContent ?? "0"),
				} satisfies RadikoStation;
			});
		},
			enabled: Boolean(resolved),
	});
}

export function useRadikoM3u8Url() {
	const { data: token } = useRadikoToken();

	return useMutation<string, Error, string>({
		mutationFn: async (stationId: string) => {
			if (!token) {
				throw new Error("Radiko token is not ready");
			}

			const m3u8Parser = new M3U8Parser();
			const response = await fetch(
				`https://si-f-radiko.smartstream.ne.jp/so/playlist.m3u8?station_id=${stationId}&type=b&l=15&lsid=11cbd3124cef9e8004f9b5e9f77b66`,
				{
					headers: { "X-Radiko-AuthToken": token.authToken },
				},
			);

			m3u8Parser.push(await response.text());
			m3u8Parser.end();

			const playlist = (m3u8Parser.manifest as { playlists?: Array<{ uri?: string }> }).playlists?.[0];
			if (!playlist?.uri) {
				throw new Error("Radiko playlist not found");
			}

			return playlist.uri;
		},
	});
}
