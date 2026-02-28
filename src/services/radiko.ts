import { useMutation, useQuery } from "@tanstack/react-query";
import type { RadikoStation } from "@/types/radio";

export function useRadikoToken() {
	return useQuery({
		queryKey: ["radio", "radiko", "token"],
		queryFn: async () => {
			const res = await fetch("/api/radiko/auth");
			if (!res.ok) {
				const { error } = (await res.json()) as { error: string };
				throw new Error(`[Error] Radiko auth failed: ${error}`);
			}
			return res.json() as Promise<{ authToken: string; areaId: string }>;
		},
		refetchInterval: 1000 * 60 * 8,
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
				const logo = Array.from(node.querySelectorAll("logo")).map(
					(logoNode) => logoNode.textContent ?? "",
				);
				return {
					id: node.querySelector("id")?.textContent ?? "",
					name: node.querySelector("name")?.textContent ?? "",
					ascii_name: node.querySelector("ascii_name")?.textContent ?? "",
					ruby: node.querySelector("ruby")?.textContent ?? "",
					areafree: Number(
						node.querySelector("areafree")?.textContent ?? "0",
					) as 0 | 1,
					timefree: Number(
						node.querySelector("timefree")?.textContent ?? "0",
					) as 0 | 1,
					logo,
					banner: node.querySelector("banner")?.textContent ?? "",
					href: node.querySelector("href")?.textContent ?? "",
					simul_max_delay: Number(
						node.querySelector("simul_max_delay")?.textContent ?? "0",
					),
					tf_max_delay: Number(
						node.querySelector("tf_max_delay")?.textContent ?? "0",
					),
				} satisfies RadikoStation;
			});
		},
		enabled: Boolean(resolved),
	});
}

export function useRadikoM3u8Url() {
	return useMutation<string, Error, string>({
		mutationFn: async (stationId: string) => {
			const res = await fetch(`/api/radiko/stream?station_id=${stationId}`);
			if (!res.ok) {
				const { error } = (await res.json()) as { error: string };
				throw new Error(`[Error] Radiko stream failed: ${error}`);
			}
			const { streamUri } = (await res.json()) as { streamUri: string };
			return streamUri;
		},
	});
}
