import { useQuery } from "@tanstack/react-query";
import type { FrequencyList } from "@/types/radio";

export function useRadioFrequencies() {
	return useQuery({
		queryKey: ["radio", "frequencies"],
		queryFn: async (): Promise<FrequencyList> =>
			(await fetch("/frequencies/all.json")).json(),
	});
}
