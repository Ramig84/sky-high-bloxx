// Browser-safe endless-mode rules: every 10 floors a new obstacle joins and earlier ones keep growing.
import type { LevelSpec } from "./levels";

export const ENDLESS_STAGES = ["Fast crane", "Wind gusts", "Sliding crane", "Rain slip", "Fog", "Night", "Narrow floors"] as const;

/** Stage reached at a given floor count (0 = fast crane only). */
export const endlessStage = (floors: number) => Math.min(ENDLESS_STAGES.length - 1, Math.floor(Math.max(0, floors) / 10));

export function endlessSpec(floors: number): LevelSpec {
  const f = Math.max(0, floors), st = endlessStage(f);
  return {
    index: -1, district: 0, level: 0, goal: Number.POSITIVE_INFINITY, perfectGoal: 0, lives: 3,
    speed: 30 + f * 0.6, // starts beyond the hardest campaign level (Cloud Peak 10 ≈ 44.5 at its own floors)
    wind: st >= 1 ? Math.round(110 + (f - 10) * 2) : 0,
    slide: st >= 2 ? Math.round(30 + (f - 20) * 0.8) : 0,
    slip: st >= 3 ? 4 + (f - 30) * 0.12 : 0,
    fog: st >= 4 ? Math.min(0.65, 0.35 + (f - 40) * 0.01) : 0,
    night: st >= 5,
    width: st >= 6 ? Math.max(0.75, 0.92 - (f - 60) * 0.004) : 1,
  };
}
