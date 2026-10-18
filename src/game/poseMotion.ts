export type PoseBlend = { current: number; next: number; mix: number };

/** Fast wingbeats remain crisp; slow painted material poses dissolve near each boundary. */
export function poseBlend(cycle: readonly number[], rate: number, phase: number, time: number, soften: boolean): PoseBlend {
  const position = Math.max(0, time) * rate + phase;
  const step = Math.floor(position), fraction = position - step;
  const current = cycle[step % cycle.length] ?? 0;
  const next = cycle[(step + 1) % cycle.length] ?? current;
  const k = soften ? Math.max(0, Math.min(1, (fraction - 0.55) / 0.45)) : 0;
  return { current, next, mix: k * k * (3 - 2 * k) };
}