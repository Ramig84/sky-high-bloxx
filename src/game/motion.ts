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

export function floorSway(sway: number, index: number) {
  // Existing floors must not jump sideways whenever the floor count changes.
  return sway * Math.pow(Math.max(0, index + 1) / 6, 1.6) / (1 + Math.pow(Math.max(0, index + 1) / 9, 1.6));
}