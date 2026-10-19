import gull from "@/assets/spirit-gull-animation.webp";
import butterfly from "@/assets/spirit-butterfly-animation.webp";
import leaf from "@/assets/spirit-leaf-animation.webp";
import steam from "@/assets/spirit-steam-animation.webp";
import lantern from "@/assets/spirit-lantern-animation.webp";
import kite from "@/assets/spirit-kite-animation.webp";
import balloon from "@/assets/spirit-balloon-animation.webp";
import boat from "@/assets/spirit-boat-animation.webp";
import petal from "@/assets/spirit-petal-animation.webp";
import dragonfly from "@/assets/spirit-dragonfly-animation.webp";
import pigeon from "@/assets/spirit-pigeon-animation.webp";
import swallow from "@/assets/spirit-swallow-animation.webp";
import firefly from "@/assets/spirit-firefly-animation.webp";
import eagle from "@/assets/spirit-eagle-animation.webp";
import type { SpiritKind } from "./sky";
import { poseBlend } from "./poseMotion";

/** Transparent, padded 4 × 2 atlases; poses change without stretching the paintings. */
export type PaintedSpirit = SpiritKind | "kite" | "balloon" | "boat" | "petal";
export const spiritArtwork: Record<PaintedSpirit, string> = { gull, butterfly, leaf, steam, lantern, kite, balloon, boat, petal, dragonfly, pigeon, swallow, firefly, eagle };
const cycles: Record<PaintedSpirit, readonly number[]> = {
  gull: [0, 1, 2, 3, 2, 1], butterfly: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1],
  leaf: [0, 1, 2, 3, 4, 5, 6, 7], steam: [0, 1, 2, 3, 4, 5, 6, 7],
  lantern: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1],
  kite: [0,1,2,3,4,5,6,7,6,5,4,3,2,1], balloon: [0,1,2,3,4,5,6,7,6,5,4,3,2,1], boat: [0,1,2,3,4,5,6,7,6,5,4,3,2,1], petal: [0,1,2,3,4,5,6,7],
  dragonfly: [0, 1, 2, 3, 4, 5, 7, 3], pigeon: [0, 1, 2, 3, 4, 5, 7, 2], swallow: [0, 1, 2, 3, 4, 5, 7, 3],
  firefly: [0, 1, 2, 3, 4, 5, 6, 7], eagle: [0, 1, 2, 3, 4, 5, 7, 2],
};
const rates: Record<PaintedSpirit, number> = { gull: 8, butterfly: 18, leaf: 6, steam: 3, lantern: 3, kite: 5, balloon: 3, boat: 3, petal: 6, dragonfly: 22, pigeon: 9, swallow: 12, firefly: 2.2, eagle: 4.5 };
export function spiritPose(kind: PaintedSpirit, index: number, time: number) {
  const cycle = cycles[kind];
  const step = Math.floor(Math.max(0, time) * rates[kind] + index * 2.73) % cycle.length;
  return cycle[step] ?? 0;
}

/** Draw registered whole paintings, never stretch wings or morph silhouettes. */
export function drawSpirit(ctx: CanvasRenderingContext2D, image: (HTMLImageElement | HTMLCanvasElement) & { naturalWidth: number; naturalHeight: number }, kind: PaintedSpirit, index: number, time: number, size: number, glide = false) {
  const blend = glide ? { current: 6, next: 6, mix: 0 } : poseBlend(cycles[kind], rates[kind], index * 2.73, time, ["steam", "lantern", "kite", "balloon", "boat", "firefly"].includes(kind));
  const cw = image.naturalWidth / 4, ch = image.naturalHeight / 2, alpha = ctx.globalAlpha;
  for (const [frame, weight] of [[blend.current, 1 - blend.mix], [blend.next, blend.mix]]) {
    if (frame === undefined || weight === undefined || weight <= 0) continue;
    ctx.globalAlpha = alpha * weight;
    ctx.drawImage(image, frame % 4 * cw, Math.floor(frame / 4) * ch, cw, ch, -size / 2, -size / 2, size, size);
  }
  ctx.globalAlpha = alpha;
}