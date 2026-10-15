import { DISTRICTS, LEVELS_PER_DISTRICT, isDistrictUnlocked, type Stars } from "./levels";

/** District Tour: the daily challenge visits one district per UTC day, the same for every player. */
const DAY_MS = 86_400_000;
export const epochDay = (now: Date) => Math.floor(now.getTime() / DAY_MS);

/** Stepping by 3 (coprime with 10) visits every district once in each 10-day cycle. Mirrored in SQL tour_district_for. */
export function tourDistrict(now = new Date()): number {
  return (epochDay(now) * 3) % DISTRICTS.length;
}

/** The level inside today's district grows with campaign progress, so beginners get its gentlest tower. */
export function tourLevel(now = new Date(), stars: Stars = []): number {
  const cleared = stars.filter(s => (s ?? 0) > 0).length;
  return tourDistrict(now) * LEVELS_PER_DISTRICT + Math.min(LEVELS_PER_DISTRICT - 1, Math.floor(cleared / 10));
}

export function tomorrowDistrict(now = new Date()): number {
  return tourDistrict(new Date(now.getTime() + DAY_MS));
}

/** True when today's tour is a preview of a district the player hasn't unlocked yet. */
export const isPreview = (district: number, stars: Stars) => !isDistrictUnlocked(stars, district);
