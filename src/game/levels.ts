// Browser-safe campaign rules: 10 districts x 10 levels with ramping goals and obstacles.
export type DistrictId = "oldtown" | "harbour" | "market" | "riverside" | "gardens" | "university" | "railyard" | "downtown" | "skyline" | "cloudpeak";
export type District = { id: DistrictId; name: string; blurb: string; mapX: number; mapY: number; obstacle: string };

// mapX/mapY: plaza positions on the 10-district painted map (percent).
export const DISTRICTS: District[] = [
  { id: "oldtown", name: "Old Town", blurb: "Coral plaster homes around the old square.", mapX: 52, mapY: 85.7, obstacle: "Calm skies" },
  { id: "harbour", name: "Harbour", blurb: "Sea-blue and sand houses beside the bay.", mapX: 49, mapY: 73.7, obstacle: "A quicker crane" },
  { id: "market", name: "Market", blurb: "Red-brick halls with striped awnings.", mapX: 48, mapY: 61.2, obstacle: "Wind gusts" },
  { id: "riverside", name: "Riverside", blurb: "Sage-green houses along the river.", mapX: 50, mapY: 53, obstacle: "Stronger wind" },
  { id: "gardens", name: "Gardens", blurb: "Lilac walls wrapped in ivy and blossom.", mapX: 54, mapY: 47.4, obstacle: "Sliding crane" },
  { id: "university", name: "University", blurb: "Limestone halls beneath the clock tower.", mapX: 54, mapY: 38.8, obstacle: "Sliding crane + wind" },
  { id: "railyard", name: "Rail Yard", blurb: "Sooty brick sheds beside the tracks.", mapX: 52, mapY: 28.9, obstacle: "Rain makes floors slip" },
  { id: "downtown", name: "Downtown", blurb: "Honey sandstone blocks in the city centre.", mapX: 51, mapY: 20.6, obstacle: "Rain and fog" },
  { id: "skyline", name: "Skyline Heights", blurb: "Pearl-grey towers above the city.", mapX: 51, mapY: 13.5, obstacle: "Night building" },
  { id: "cloudpeak", name: "Cloud Peak", blurb: "Rose-gold rooftops in the clouds.", mapX: 51, mapY: 7.5, obstacle: "Night + narrower floors" },
];

export const LEVELS_PER_DISTRICT = 10;
export const TOTAL_LEVELS = DISTRICTS.length * LEVELS_PER_DISTRICT;

// Temporary map access only; never fabricate stars or alter earned progression.
export const OPEN_ALL_FOR_TESTING = true;
export const isTestingLevelAvailable = (stars: Stars, index: number) =>
  Number.isInteger(index) && index >= 0 && index < TOTAL_LEVELS &&
  (OPEN_ALL_FOR_TESTING || isLevelUnlocked(stars, index));
export const isTestingDistrictAvailable = (stars: Stars, district: number) =>
  Number.isInteger(district) && isTestingLevelAvailable(stars, district * LEVELS_PER_DISTRICT);

export type LevelSpec = {
  index: number; district: number; level: number;
  goal: number;        // floors needed to clear the level (never below 10)
  perfectGoal: number; // perfect drops for the second star
  lives: number;
  speed: number;       // added to swing difficulty
  wind: number;        // horizontal push on falling floors (px/s^2)
  slide: number;       // crane sliding amplitude (px)
  slip: number;        // rain: off-centre landings slide outward (px)
  fog: number;         // 0..1 fog strength over the top of the screen
  night: boolean;
  width: number;       // floor width multiplier
  gravity?: number;    // Space Climb only: fall gravity multiplier (1 = normal)
  pull?: number;       // Space Climb only: constant sideways pull (px/s^2)
  arc?: number;        // Space Climb only: vertical crane arc amplitude (px)
};

/** Floors to clear: each district climbs from 15 + 5d to 50 + 10d (Old Town 15→50 … Cloud Peak 60→140). */
export function districtGoal(d: number, l: number) {
  const start = 15 + 5 * d, end = 50 + 10 * d;
  return Math.round(start + ((end - start) * l) / (LEVELS_PER_DISTRICT - 1));
}

export function levelSpec(index: number): LevelSpec {
  const n = Math.max(0, Math.min(TOTAL_LEVELS - 1, Math.floor(index)));
  const d = Math.floor(n / LEVELS_PER_DISTRICT), l = n % LEVELS_PER_DISTRICT;
  return {
    index: n, district: d, level: l,
    goal: districtGoal(d, l),
    perfectGoal: Math.round(districtGoal(d, l) * 0.25),
    lives: l === LEVELS_PER_DISTRICT - 1 && d > 0 ? 2 : 3,
    speed: n * 0.81, // 10% gentler growth, still faster every level
    wind: d >= 2 ? Math.round(100 + (n - 20) * 2.5) : 0,
    slide: d >= 4 ? Math.round(30 + (n - 40) * 0.9) : 0,
    slip: d >= 6 ? 3 + (n - 60) * 0.1 : 0,
    fog: d >= 7 ? Math.min(0.6, 0.3 + (n - 70) * 0.012) : 0,
    night: d >= 8,
    width: d >= 9 ? Math.max(0.85, 1 - 0.015 * (l + 1)) : 1,
  };
}

/** 0 = not cleared; 1 = goal; +1 for perfect goal; +1 for no lives lost. */
export function starsFor(spec: LevelSpec, floors: number, perfects: number, livesLost: number): number {
  if (floors < spec.goal) return 0;
  return 1 + (perfects >= spec.perfectGoal ? 1 : 0) + (livesLost === 0 ? 1 : 0);
}

export type Stars = number[]; // best stars per level index
export function isLevelUnlocked(stars: Stars, index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= TOTAL_LEVELS) return false;
  // Old saves and merged progress may contain isolated later wins. They must
  // never bypass an unfinished earlier level; retain their stars for replay.
  for (let i = 0; i < index; i++) {
    if (!((stars[i] ?? 0) > 0)) return false;
  }
  return true;
}
export const isDistrictUnlocked = (stars: Stars, d: number) => isLevelUnlocked(stars, d * LEVELS_PER_DISTRICT);
export const districtStars = (stars: Stars, d: number) => stars.slice(d * LEVELS_PER_DISTRICT, (d + 1) * LEVELS_PER_DISTRICT).reduce((a, b) => a + (b ?? 0), 0);
export const districtCleared = (stars: Stars, d: number) => isDistrictUnlocked(stars, d) && Array.from({ length: LEVELS_PER_DISTRICT }, (_, l) => (stars[d * LEVELS_PER_DISTRICT + l] ?? 0) > 0).every(Boolean);
export function recordStars(stars: Stars, index: number, value: number): Stars {
  if ((stars[index] ?? 0) >= value) return stars;
  const next = [...stars]; next[index] = value; return next;
}

const KEY = "bloxx-stars";
export function loadStars(): Stars { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }
export function saveStars(s: Stars) { localStorage.setItem(KEY, JSON.stringify(s)); }
