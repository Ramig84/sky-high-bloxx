/** Keep real elapsed time at low FPS, but never simulate an entire suspension on return. */
export const MAX_FRAME_SECONDS = 0.5;
export const MAX_PHYSICS_STEP = 1 / 60;

export function frameDelta(lastFrame: number, now: number, paused: boolean) {
  if (paused || !Number.isFinite(lastFrame) || !Number.isFinite(now)) return 0;
  return Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - lastFrame) / 1000));
}

/** A bounded number of small physics steps; ordinary slow frames lose no elapsed time. */
export function physicsSteps(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.ceil(Math.min(seconds, MAX_FRAME_SECONDS) / MAX_PHYSICS_STEP);
}
