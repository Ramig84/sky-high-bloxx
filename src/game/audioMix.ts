/** Coin arrivals sit behind the landing cues rather than competing with them. */
export function effectGain(name: string, volume: number) {
  return volume * (name === "coins" || name === "coinDing" ? 0.22 : 1);
}