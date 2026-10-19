import cloud from "@/assets/cloud-animation.webp";
import aurora from "@/assets/aurora-animation.webp";

export const atmosphereArtwork = { cloud, aurora };

/** Whole authored poses dissolve in place; neither the painting nor its axes are deformed. */
export function atmospherePose(time: number, phase = 0) {
  const cycle = Math.max(0, time * 0.42 + phase);
  const frame = Math.floor(cycle);
  const fraction = cycle - frame;
  return { from: frame % 8, to: (frame + 1) % 8, blend: fraction * fraction * (3 - 2 * fraction) };
}

export function drawAtmosphere(ctx: CanvasRenderingContext2D, img: HTMLImageElement, time: number, phase: number, x: number, y: number, width: number, alpha: number) {
  const cell = img.naturalWidth / 4, height = img.naturalHeight / 2;
  if (!cell || !height || alpha <= 0.004) return; // invisible layers cost a full paint, skip them
  const pose = atmospherePose(time, phase);
  ctx.save();
  for (const [frame, weight] of [[pose.from, 1 - pose.blend], [pose.to, pose.blend]]) {
    if (frame === undefined || weight === undefined || weight <= 0) continue;
    ctx.globalAlpha = alpha * weight;
    ctx.drawImage(img, frame % 4 * cell, Math.floor(frame / 4) * height, cell, height, x, y, width, width * height / cell);
  }
  ctx.restore();
}