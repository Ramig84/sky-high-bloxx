/** Small rewards use one sprite per coin; larger rewards use explicitly labelled bundles. */
export function coinFlightAmounts(reward: number, reduced = false): number[] {
  const total = Math.max(0, Math.floor(reward));
  if (!total) return [];
  const count = reduced ? 1 : Math.min(total, 12);
  return Array.from({ length: count }, (_, i) => Math.floor(total / count) + (i < total % count ? 1 : 0));
}

/** Continuous curved travel; no abrupt trip to a screen-edge corridor. */
export function coinFlightPoint(dx: number, dy: number, index: number, count: number, t: number) {
  const k = Math.max(0, Math.min(1, t)), u = 1 - k;
  if (k === 0) return { x: 0, y: 0 };
  if (k === 1) return { x: dx, y: dy };
  const spread = (index - (count - 1) / 2) * 5;
  const lift = Math.min(70, Math.abs(dy) * 0.18 + 28);
  return {
    x: 3 * u * u * k * (dx * 0.18 + spread) + 3 * u * k * k * (dx * 0.72 + spread) + k * k * k * dx,
    y: 3 * u * u * k * (-lift) + 3 * u * k * k * (dy * 0.65 - lift) + k * k * k * dy,
  };
}