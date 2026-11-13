/** Coin arrivals sit behind the landing cues rather than competing with them. */
export function effectGain(name: string, volume: number) {
  return volume * (name === "coins" || name === "coinDing" ? 0.22 : 1);
}
/** Landing thuds sit deep at the footing and turn crisper as the tower climbs (playback rate). */
export function landingPitch(floorIndex: number) {
  return 0.86 + Math.min(1, Math.max(0, floorIndex) / 40) * 0.22;
}
export type DuckEvent = "land" | "perfect" | "collapse";
/** Music and ambience dip under heavy impacts so the hit leads the mix, then recover. */
export function duckProfile(ev: DuckEvent) {
  if (ev === "collapse") return { depth: 0.5, attack: 0.02, release: 0.9 };
  if (ev === "perfect") return { depth: 0.35, attack: 0.015, release: 0.45 };
  return { depth: 0.22, attack: 0.015, release: 0.32 };
}
