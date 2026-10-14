/** Small rewards use one sprite per coin; larger rewards use explicitly labelled bundles. */
export function coinFlightAmounts(reward: number, reduced = false): number[] {
  const total = Math.max(0, Math.floor(reward));
  if (!total) return [];
  const count = reduced ? 1 : Math.min(total, 12);
  return Array.from({ length: count }, (_, i) => Math.floor(total / count) + (i < total % count ? 1 : 0));
}