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
};

export function levelSpec(index: number): LevelSpec {
  const n = Math.max(0, Math.min(TOTAL_LEVELS - 1, Math.floor(index)));
  const d = Math.floor(n / LEVELS_PER_DISTRICT), l = n % LEVELS_PER_DISTRICT;
  return {
    index: n, district: d, level: l,
    goal: 10 + Math.round(n * 0.25),
    perfectGoal: 3 + Math.floor(n / 12),
    lives: l === LEVELS_PER_DISTRICT - 1 && d > 0 ? 2 : 3,
    speed: n * 0.45, // crane swings faster every level: Old Town 1 → Cloud Peak 10
    wind: d >= 2 ? Math.round(60 + (n - 20) * 1.5) : 0,
    slide: d >= 4 ? Math.round(20 + (n - 40) * 0.6) : 0,
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
export const isLevelUnlocked = (stars: Stars, index: number) => index <= 0 || (stars[index - 1] ?? 0) > 0;
export const isDistrictUnlocked = (stars: Stars, d: number) => isLevelUnlocked(stars, d * LEVELS_PER_DISTRICT);
export const districtStars = (stars: Stars, d: number) => stars.slice(d * LEVELS_PER_DISTRICT, (d + 1) * LEVELS_PER_DISTRICT).reduce((a, b) => a + (b ?? 0), 0);
export const districtCleared = (stars: Stars, d: number) => (stars[(d + 1) * LEVELS_PER_DISTRICT - 1] ?? 0) > 0;
export function recordStars(stars: Stars, index: number, value: number): Stars {
  if ((stars[index] ?? 0) >= value) return stars;
  const next = [...stars]; next[index] = value; return next;
}

const KEY = "bloxx-stars";
export function loadStars(): Stars { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }
export function saveStars(s: Stars) { localStorage.setItem(KEY, JSON.stringify(s)); }
