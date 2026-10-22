export const BLOCK_HEIGHT = 1.3;
export const ROPE_LENGTH = 3.6;
export const HOOK_HEIGHT = BLOCK_HEIGHT + 0.15;

/** Crane swing rate (rad/s) for a difficulty level; capped so late game stays humanly playable. */
export const swingRate = (level: number) => Math.min(1.9 + level * 0.03, 5);

export function advanceSwing(phase: number, level: number, dt: number) {
  return phase + swingRate(level) * dt;
}

export function suspendedBlock(theta: number, pivotY: number) {
  // The rope and the lifting bracket share a single rotating attachment.
  const length = ROPE_LENGTH + HOOK_HEIGHT;
  return { x: Math.sin(theta) * length, y: pivotY - Math.cos(theta) * length };
}

export function integrateFall(f: { x: number; y: number; vx: number; vy: number }, dt: number, gravity: number) {
  f.x += f.vx * dt;
  f.y += f.vy * dt - gravity * dt * dt / 2;
  f.vy -= gravity * dt;
}

/** Stop exactly at contact, rather than judging the offset a frame too late. */
export function advanceToLanding(f: { x: number; y: number; vx: number; vy: number }, dt: number, gravity: number, surface: number, halfHeight: number) {
  const gap = f.y - halfHeight - surface;
  const contactTime = gap <= 0 ? 0 : (f.vy + Math.sqrt(f.vy * f.vy + 2 * gravity * gap)) / gravity;
  const landed = contactTime <= dt;
  integrateFall(f, landed ? contactTime : dt, gravity);
  if (landed) f.y = surface + halfHeight;
  return landed;
}

export function floorSway(sway: number, index: number) {
  // The ground floor is fixed; height, not changing floor count, determines bending.
  return sway * Math.pow(Math.max(0, index) / 6, 1.6) / (1 + Math.pow(Math.max(0, index) / 9, 1.6));
}
// ---- 2D rules (illustrated canvas game) ----
export const BLOCK_W = 84;
export const BLOCK_H = 50;
export const PERFECT_RATIO = 0.04;
export const FIRST_FLOOR_TOLERANCE = 0.45;

export type Landing = "miss" | "perfect" | "ok";

/** Classify a landing by horizontal offset from the supporting floor (or plot). */
export function classifyLanding(offset: number, width: number, firstFloor = false): Landing {
  const a = Math.abs(offset);
  if (a <= width * PERFECT_RATIO) return "perfect";
  if (a > width * (firstFloor ? FIRST_FLOOR_TOLERANCE : 0.5)) return "miss";
  return "ok";
}

export function floorPosition(x: number, swayAtLanding: number, sway: number, index: number, width: number) {
  return x + (floorSway(sway, index) - floorSway(swayAtLanding, index)) * width / 2;
}

/** Restrained bend: bounded lean response avoids a self-amplifying COM/sway loop. */
export function targetTowerSway(lean: number, floors: number, time: number) {
  const bias = Math.max(-0.28, Math.min(0.28, lean * 0.32));
  const ripple = 0.025 + Math.min(floors, 30) * 0.002 + Math.min(Math.abs(lean), 1) * 0.035;
  return bias + Math.sin(time * 1.5) * ripple;
}

export const floorDifficulty = (floors: number, speed: number) => speed + floors * 0.45;

/** Equal-mass stack balance at the actual contact overlap, including the footing.
 * -2 means foundation failure, -1 stable, otherwise the supporting floor index.
 */
export function collapseIndex(xs: number[], width: number, foundationWidth = width * 1.12, widths?: readonly number[]): number {
  let sum = xs.reduce((total, x) => total + x, 0);
  for (let i = -1; i < xs.length - 1; i++) {
    const lowerX = i < 0 ? 0 : (xs[i] ?? 0);
    const lowerHalf = i < 0 ? foundationWidth / 2 : (widths?.[i] ?? width) / 2;
    const upperX = xs[i + 1] ?? 0;
    const left = Math.max(lowerX - lowerHalf, upperX - (widths?.[i + 1] ?? width) / 2);
    const right = Math.min(lowerX + lowerHalf, upperX + (widths?.[i + 1] ?? width) / 2);
    const com = sum / (xs.length - i - 1);
    if (left > right || com < left - 1e-7 || com > right + 1e-7) return i < 0 ? -2 : i;
    sum -= upperX;
  }
  return -1;
}

/** Risk is closeness to the weakest contact edge, not a probability or a floor-count estimate. */
export function towerBalance(xs: number[], width: number, foundationWidth = width * 1.12, widths?: readonly number[]) {
  let sum = xs.reduce((a, b) => a + b, 0), risk = 0, direction = 0;
  for (let i = -1; i < xs.length - 1; i++) {
    const lower = i < 0 ? 0 : (xs[i] ?? 0), upper = xs[i + 1] ?? 0;
    const half = i < 0 ? foundationWidth / 2 : (widths?.[i] ?? width) / 2;
    const left = Math.max(lower - half, upper - (widths?.[i + 1] ?? width) / 2), right = Math.min(lower + half, upper + (widths?.[i + 1] ?? width) / 2);
    const com = sum / (xs.length - i - 1), midpoint = (left + right) / 2;
    const value = right <= left ? 1 : Math.min(1, Math.abs(com - midpoint) / ((right - left) / 2));
    if (value > risk) { risk = value; direction = Math.sign(com - midpoint); }
    sum -= upper;
  }
  return { risk, direction, state: risk >= 0.85 ? "danger" : risk >= 0.6 ? "warning" : "stable" } as const;
}

export function landingReward(kind: Landing, combo: number) {
  if (kind === "miss") return { combo: 0, points: 0 };
  if (kind === "ok") return { combo: 0, points: 10 };
  const next = combo + 1;
  return { combo: next, points: 25 * Math.min(next, 10) };
}
