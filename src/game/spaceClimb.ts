// Browser-safe Space Climb (Endless) rules: rise from the rooftops through the sky to deep space.
import type { LevelSpec } from "./levels";

export type SpaceZone = { id: string; name: string; start: number; speedStep: number };

/** Earth zones are short so players reach space sooner; space zones lengthen. */
export const SPACE_ZONES: readonly SpaceZone[] = [
  { id: "rooftops", name: "Rooftops", start: 0, speedStep: 0 },
  { id: "clouds", name: "High Clouds", start: 25, speedStep: 8 },
  { id: "storm", name: "Storm & Aurora", start: 50, speedStep: 16 },
  { id: "edge", name: "Edge of Space", start: 75, speedStep: 24 },
  { id: "orbit", name: "Orbit", start: 100, speedStep: 36 },
  { id: "moon", name: "The Moon", start: 150, speedStep: 44 },
  { id: "mars", name: "Mars", start: 200, speedStep: 52 },
  { id: "asteroids", name: "Asteroid Belt", start: 260, speedStep: 60 },
  { id: "jupiter", name: "Jupiter", start: 330, speedStep: 68 },
  { id: "saturn", name: "Saturn", start: 410, speedStep: 76 },
  { id: "deep", name: "Deep Space", start: 500, speedStep: 86 },
];

export const SPACE_BEST_KEY = "bloxx-space-best";

/** Zone index for a floor count. */
export function zoneAt(floors: number) {
  const f = Math.max(0, Math.floor(floors));
  let z = 0;
  for (let i = 0; i < SPACE_ZONES.length; i++) if (f >= SPACE_ZONES[i]!.start) z = i;
  return z;
}

/** Floors left until the next zone (null in Deep Space). */
export function floorsToNextZone(floors: number) {
  const next = SPACE_ZONES[zoneAt(floors) + 1];
  return next ? next.start - Math.max(0, Math.floor(floors)) : null;
}

/**
 * Painted zone skies dissolve, never swap: the current painting holds until the last
 * third of a zone, then fades into the next zone's colours across that stretch.
 */
export function spaceSkyMix(floors: number) {
  const f = Math.max(0, Math.floor(floors));
  const z = zoneAt(f);
  const next = SPACE_ZONES[z + 1];
  if (!next) return { from: z, to: z, t: 0 };
  const window = Math.max(3, Math.round((next.start - SPACE_ZONES[z]!.start) * 0.34));
  const left = next.start - f;
  const raw = left >= window ? 0 : 1 - left / window;
  return { from: z, to: z + 1, t: raw * raw * (3 - 2 * raw) };
}

const MAX_SPEED_FLOORS = 600;

export function spaceSpec(floors: number): LevelSpec {
  const f = Math.max(0, floors), z = zoneAt(f), zone = SPACE_ZONES[z]!;
  const inZone = Math.min(f, MAX_SPEED_FLOORS) - zone.start;
  const mild = (from: number) => z >= from;
  return {
    index: -1, district: 0, level: 0, goal: Number.POSITIVE_INFINITY, perfectGoal: 0, lives: 3,
    // Starts above the campaign finale; steps up at each zone plus a small climb inside it.
    speed: 92 + zone.speedStep + Math.max(0, inZone) * 0.08,
    wind: mild(1) ? Math.round((z === 6 ? 190 : 110) + Math.min(f, MAX_SPEED_FLOORS) * 0.12) : 0,
    slip: mild(2) ? Math.min(7, 3.5 + f * 0.006) : 0,
    slide: mild(3) ? Math.round(Math.min(70, 26 + f * 0.06)) : 0,
    fog: 0,
    night: z >= 3,
    width: mild(7) ? Math.max(0.78, 0.92 - (f - 260) * 0.0006) : 1,
    gravity: z === 5 ? 0.7 : 1,
    pull: mild(8) ? 40 : 0,
    arc: mild(9) ? 18 : 0,
  };
}
