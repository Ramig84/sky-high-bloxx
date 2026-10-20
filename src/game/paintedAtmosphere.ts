import cloud from "@/assets/cloud-animation.webp";
import aurora from "@/assets/aurora-animation.webp";

export const atmosphereArtwork = { cloud, aurora };

/** Softer jade the approved aurora poses are washed toward, so the lights read painted, not neon. */
export const AURORA_JADE = "rgb(120, 178, 156)";
export const AURORA_JADE_MIX = 0.55;

/** Whole authored poses dissolve in place; neither the painting nor its axes are deformed. */
export function atmospherePose(time: number, phase = 0) {
  const cycle = Math.max(0, time * 0.42 + phase);
  const frame = Math.floor(cycle);
  const fraction = cycle - frame;
  return { from: frame % 8, to: (frame + 1) % 8, blend: fraction * fraction * (3 - 2 * fraction) };
}

type AtmosphereSource = HTMLImageElement | HTMLCanvasElement;
const size = (img: AtmosphereSource): [number, number] => img instanceof HTMLImageElement ? [img.naturalWidth, img.naturalHeight] : [img.width, img.height];

let tinted = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
/** Forget cached washes so they are repainted on a fresh surface (after a full-screen ad). */
export function resetAtmosphereCache() { tinted = new WeakMap(); }
/** One-time jade wash of the same painting (cached), keeping every brushstroke and its transparency. */
export function jadeTinted(img: HTMLImageElement): AtmosphereSource {
  const hit = tinted.get(img);
  if (hit) return hit;
  if (typeof document === "undefined" || !img.naturalWidth) return img;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext("2d");
  if (!g) return img;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.globalAlpha = AURORA_JADE_MIX;
  g.fillStyle = AURORA_JADE;
  g.fillRect(0, 0, c.width, c.height);
  tinted.set(img, c);
  return c;
}

export function drawAtmosphere(ctx: CanvasRenderingContext2D, img: AtmosphereSource, time: number, phase: number, x: number, y: number, width: number, alpha: number) {
  const [w, h] = size(img);
  const cell = w / 4, height = h / 2;
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
