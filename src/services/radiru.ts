import { useQuery } from "@tanstack/react-query";
import type { RadiruStation } from "../types/radio";

export function useRadiruStationList() {
	return useQuery({
		queryKey: ["radio", "radiru", "stations"],
		queryFn: async () => {
			const res = await fetch("https://www.nhk.or.jp/radio/config/config_web.xml");
			const xml = await res.text();
			const doc = new DOMParser().parseFromString(xml, "application/xml");
			const dataNodes = Array.from(doc.querySelectorAll("stream_url > data"));

			return dataNodes.map((node) => ({
				areajp: node.querySelector("areajp")?.textContent ?? "",
				area: node.querySelector("area")?.textContent ?? "",
				apikey: Number(node.querySelector("apikey")?.textContent ?? "0"),
				areakey: Number(node.querySelector("areakey")?.textContent ?? "0"),
				r1hls: node.querySelector("r1hls")?.textContent ?? "",
				r2hls: node.querySelector("r2hls")?.textContent ?? "",
				fmhls: node.querySelector("fmhls")?.textContent ?? "",
			}) satisfies RadiruStation);
		},
	});
}
