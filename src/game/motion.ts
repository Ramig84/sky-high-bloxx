export const BLOCK_HEIGHT = 1.3;
export const ROPE_LENGTH = 3.6;
export const HOOK_HEIGHT = BLOCK_HEIGHT + 0.15;

export function advanceSwing(phase: number, level: number, dt: number) {
  return phase + Math.min(1.9 + level * 0.03, 3.2) * dt;
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
  // Existing floors must not jump sideways whenever the floor count changes.
  return sway * Math.pow(Math.max(0, index + 1) / 6, 1.6) / (1 + Math.pow(Math.max(0, index + 1) / 9, 1.6));
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

/** Index of the lowest floor whose upper stack's centre of mass overhangs it; -1 if stable. */
export function collapseIndex(xs: number[], width: number): number {
  for (let i = 0; i < xs.length - 1; i++) {
    let sum = 0;
    for (let j = i + 1; j < xs.length; j++) sum += xs[j] ?? 0;
    const com = sum / (xs.length - i - 1);
    if (Math.abs(com - (xs[i] ?? 0)) > width / 2) return i;
  }
  return -1;
}
