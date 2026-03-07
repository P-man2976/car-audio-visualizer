/**
 * Fisher-Yates シャッフル。元の配列を変更せず、新しいシャッフル済み配列を返す。
 */
export function shuffleArray<T>(arr: readonly T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
