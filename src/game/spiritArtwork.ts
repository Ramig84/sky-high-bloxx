import gull from "@/assets/spirit-gull-animation.webp";
import butterfly from "@/assets/spirit-butterfly-animation.webp";
import leaf from "@/assets/spirit-leaf-animation.webp";
import steam from "@/assets/spirit-steam-animation.webp";
import lantern from "@/assets/spirit-lantern-animation.webp";
import type { SpiritKind } from "./sky";

/** Transparent, padded 4 × 2 atlases; poses change without stretching the paintings. */
export const spiritArtwork: Record<SpiritKind, string> = { gull, butterfly, leaf, steam, lantern };
const cycles: Record<SpiritKind, readonly number[]> = {
  gull: [0, 3, 2, 4, 2, 3], butterfly: [0, 1, 2, 3, 4, 5, 6, 7],
  leaf: [0, 1, 2, 3, 4, 5, 6, 7], steam: [0, 1, 2, 3, 4, 5, 6, 7],
  lantern: [0, 1, 2, 3, 4, 5, 6, 7],
};
const rates: Record<SpiritKind, number> = { gull: 9, butterfly: 18, leaf: 8, steam: 3, lantern: 7 };
export function spiritPose(kind: SpiritKind, index: number, time: number) {
  const cycle = cycles[kind];
  const step = Math.floor(Math.max(0, time) * rates[kind] + index * 2.73) % cycle.length;
  return cycle[step] ?? 0;
}