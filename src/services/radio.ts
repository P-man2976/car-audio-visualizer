import { useQuery } from "@tanstack/react-query";
import type { FrequencyList } from "@/types/radio";
import { useRadikoArea } from "@/services/radiko";

/**
 * radiko で取得した都道府県コード (JP13 等) に対応する
 * 周波数リストを /frequencies/:jpCode.json から取得する。
 * areaId が確定するまでクエリは保留される。
 */
export function useRadioFrequencies() {
	const areaId = useRadikoArea();

	return useQuery({
		queryKey: ["radio", "frequencies", areaId],
		queryFn: async (): Promise<FrequencyList> => {
			const res = await fetch(`/frequencies/${areaId}.json`);
			if (!res.ok) {
				throw new Error(
					`[Error] Failed to load frequencies for ${areaId}: ${res.status}`,
				);
			}
			return res.json() as Promise<FrequencyList>;
		},
		enabled: !!areaId,
		// 周波数データは静的なのでセッション中は再取得不要
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
	});
}
