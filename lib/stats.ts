/**
 * Percentile using linear interpolation between closest ranks
 * (matches Excel PERCENTILE.INC / numpy default "linear" method).
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];

  const rank = (p / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const weight = rank - lowerIndex;

  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}
