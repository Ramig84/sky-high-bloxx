// Browser-safe landing impact rules: painted dust timing, camera impulse spring,
// floor settle and haptic patterns. Cosmetic only — never touches physics or rewards.
export const DUST_POSES = 8;
export const DUST_LIFE = 0.62; // seconds for the eight authored poses
export const DUST_COLS = 4;

/** Whole authored pose for a puff of this age, or -1 once finished. */
export function dustPose(age: number): number {
  if (age < 0 || age >= DUST_LIFE) return -1;
  return Math.min(DUST_POSES - 1, Math.floor((age / DUST_LIFE) * DUST_POSES));
}
/** Fade only across the last two poses so the dispersal reads, not a pop. */
export function dustAlpha(age: number): number {
  const t = age / DUST_LIFE;
  if (t < 0 || t >= 1) return 0;
  return t < 0.75 ? 1 : (1 - t) / 0.25;
}

export type Kick = { x: number; y: number; vx: number; vy: number };
export const freshKick = (): Kick => ({ x: 0, y: 0, vx: 0, vy: 0 });

/** Directional impulse: centred drops thud down, off-centre drops jolt sideways by the offset share. */
export function landingKick(k: Kick, offsetShare: number, perfect: boolean): Kick {
  const side = Math.max(-1, Math.min(1, offsetShare));
  return { ...k, vy: k.vy + (perfect ? 150 : 110), vx: k.vx + side * 120 };
}
/** Damped spring back to rest (critically-ish damped, stiffness 420). */
export function advanceKick(k: Kick, dt: number): Kick {
  const stiff = 420, damp = 26;
  const vx = k.vx + (-stiff * k.x - damp * k.vx) * dt;
  const vy = k.vy + (-stiff * k.y - damp * k.vy) * dt;
  return { x: k.x + vx * dt, y: k.y + vy * dt, vx, vy };
}

export const SETTLE_TIME = 0.16;
/** Vertical squash of the landing floor: 0 → peak 3.5% → 0 over SETTLE_TIME. */
export function settleSquash(age: number): number {
  if (age < 0 || age >= SETTLE_TIME) return 0;
  return 0.035 * Math.sin((age / SETTLE_TIME) * Math.PI);
}

export type HapticEvent = "release" | "land" | "perfect" | "danger";
/** Vibration patterns (ms). Perfect pulses tighten as the combo climbs. */
export function hapticPattern(ev: HapticEvent, combo = 0): number[] {
  if (ev === "release") return [8];
  if (ev === "land") return [22];
  if (ev === "danger") return [60, 40, 60];
  const gap = Math.max(25, 60 - Math.min(combo, 7) * 5);
  return [18, gap, 28];
}

// ---- Window lamplight: Perfect drops light the landed floor and cascade down the tower ----
/** Glass panes shared by every district floor painting (normalised to the floor rectangle). */
export const WINDOW_PANES = [
  { x0: 0.186, x1: 0.362, y0: 0.2, y1: 0.72 },
  { x0: 0.633, x1: 0.814, y0: 0.2, y1: 0.72 },
] as const;
export const LIGHT_REST = 0.58;
export const LIGHT_STEP = 0.09; // seconds between floors as the light travels down
/** Floors a Perfect lights: the landed floor plus one more per combo step, at most six. */
export const cascadeDepth = (combo: number) => Math.max(1, Math.min(6, combo));
/** Lamp catch: two quick flickers, a warm peak, then a steady lived-in glow that stays. */
export function windowGlow(age: number): number {
  if (age < 0) return 0;
  if (age < 0.06) return 0.55;
  if (age < 0.1) return 0.12;
  if (age < 0.16) return 0.8;
  if (age < 0.2) return 0.4;
  if (age < 0.35) return 0.4 + ((age - 0.2) / 0.15) * 0.6;
  if (age < 1.6) return LIGHT_REST + (1 - LIGHT_REST) * Math.pow(1 - (age - 0.35) / 1.25, 2);
  return LIGHT_REST;
}
