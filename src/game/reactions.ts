export type SpectatorMood = "idle" | "happy" | "sad";

/** Two grounded painted keyframes per mood; no whole-sprite hopping. */
export function spectatorPose(mood: SpectatorMood, elapsed: number) {
  const frames = mood === "happy" ? [2, 3] : mood === "sad" ? [4, 5] : [0, 1];
  const interval = mood === "happy" ? 0.28 : mood === "sad" ? 0.7 : 1.4;
  return frames[Math.floor(Math.max(0, elapsed) / interval) % 2] ?? 0;
}