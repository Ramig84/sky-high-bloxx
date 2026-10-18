import gull from "@/assets/spirit-gull-animation.webp";
import butterfly from "@/assets/spirit-butterfly-animation.webp";
import leaf from "@/assets/spirit-leaf-animation.webp";
import steam from "@/assets/spirit-steam-animation.webp";
import lantern from "@/assets/spirit-lantern-animation.webp";
import kite from "@/assets/spirit-kite-animation.webp";
import balloon from "@/assets/spirit-balloon-animation.webp";
import boat from "@/assets/spirit-boat-animation.webp";
import petal from "@/assets/spirit-petal-animation.webp";
import type { SpiritKind } from "./sky";

/** Transparent, padded 4 × 2 atlases; poses change without stretching the paintings. */
export type PaintedSpirit = SpiritKind | "kite" | "balloon" | "boat" | "petal";
export const spiritArtwork: Record<PaintedSpirit, string> = { gull, butterfly, leaf, steam, lantern, kite, balloon, boat, petal };
const cycles: Record<PaintedSpirit, readonly number[]> = {
  gull: [0, 1, 2, 3, 2, 1], butterfly: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1],
  leaf: [0, 1, 2, 3, 4, 5, 6, 7], steam: [0, 1, 2, 3, 4, 5, 6, 7],
  lantern: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1],
  kite: [0,1,2,3,4,5,6,7,6,5,4,3,2,1], balloon: [0,1,2,3,4,5,6,7,6,5,4,3,2,1], boat: [0,1,2,3,4,5,6,7,6,5,4,3,2,1], petal: [0,1,2,3,4,5,6,7],
};
const rates: Record<PaintedSpirit, number> = { gull: 8, butterfly: 18, leaf: 6, steam: 3, lantern: 3, kite: 5, balloon: 3, boat: 3, petal: 6 };
export function spiritPose(kind: PaintedSpirit, index: number, time: number) {
  const cycle = cycles[kind];
  const step = Math.floor(Math.max(0, time) * rates[kind] + index * 2.73) % cycle.length;
  return cycle[step] ?? 0;
}