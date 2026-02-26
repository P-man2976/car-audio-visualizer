export const DEFAULT_BAR_COUNT = 24;

type AnalyzerBarLike = {
	value?: number[];
};

function clampLevel(rawLevel: number) {
	if (Number.isNaN(rawLevel)) {
		return 0;
	}

	if (rawLevel < 0) {
		return 0;
	}

	if (rawLevel > 1) {
		return 1;
	}

	return rawLevel;
}

export function toBarLevels(
	bars: AnalyzerBarLike[] | null | undefined,
	count = DEFAULT_BAR_COUNT,
) {
	const safeCount = Math.max(1, count);

	if (!bars || bars.length === 0) {
		return Array.from({ length: safeCount }, () => 0);
	}

	return Array.from({ length: safeCount }, (_, index) => {
		const sourceIndex = Math.floor((index / safeCount) * bars.length);
		const rawLevel = bars[sourceIndex]?.value?.[0] ?? 0;
		return clampLevel(rawLevel);
	});
}
