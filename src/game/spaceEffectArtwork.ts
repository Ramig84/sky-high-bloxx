import debris from "@/assets/space-debris-poses.webp";
import asteroid from "@/assets/space-asteroid-poses.webp";
import lunarDust from "@/assets/space-lunar-dust-poses.webp";
import marsDust from "@/assets/space-mars-dust-poses.webp";
import comet from "@/assets/space-comet-poses.webp";
import stormBand from "@/assets/space-jupiter-storm-poses.webp";
import nebula from "@/assets/space-nebula-poses.webp";
import lightning from "@/assets/space-lightning-poses.webp";
import ringIce from "@/assets/space-ring-ice-poses.webp";
import { atmosphereArtwork } from "./paintedAtmosphere";
import { spiritArtwork } from "./spiritArtwork";
import { poseBlend } from "./poseMotion";
import { spaceSceneryTransform } from "./spaceScenery";
import { SPACE_EFFECTS, spaceEffectLayers, spaceEffectMotion, spaceMaterialAnchor, spaceLightningClock, type SpaceEffectKind } from "./spaceEffects";

export const spaceEffectArtwork = { debris, asteroid, lunarDust, marsDust, comet, stormBand, nebula, lightning, ringIce, cloud: atmosphereArtwork.cloud, aurora: atmosphereArtwork.aurora, bird: spiritArtwork.gull };
export const SPACE_EFFECT_IMAGES = [...new Set([...Object.values(spaceEffectArtwork), spiritArtwork.eagle])];
const cycle = [0, 1, 2, 3, 4, 5, 6, 7];
const rates: Record<SpaceEffectKind, number> = { debris: 4, asteroid: 4.5, lunarDust: 1.1, marsDust: 1.3, comet: 5, stormBand: 0.7, nebula: 0.5, lightning: 7, ringIce: 3.5, cloud: 0.55, aurora: 0.45, bird: 8 };

/** Every action selects a whole painted pose. Only travel mirrors/translates; no silhouette deformation. */
export function drawSpacePose(ctx: CanvasRenderingContext2D, image: HTMLImageElement, kind: SpaceEffectKind, time: number, index: number, size: number) {
  if (!image.complete || !image.naturalWidth) return;
  const material = !["debris", "asteroid", "ringIce", "bird"].includes(kind);
  const blend = poseBlend(cycle, rates[kind], index * 1.73, time, material);
  const cw = image.naturalWidth / 4, ch = image.naturalHeight / 2, alpha = ctx.globalAlpha;
  for (const [pose, weight] of [[blend.current, 1 - blend.mix], [blend.next, blend.mix]]) {
    if (pose === undefined || weight === undefined || weight < 0.005) continue;
    ctx.globalAlpha = alpha * weight;
    ctx.drawImage(image, pose % 4 * cw, Math.floor(pose / 4) * ch, cw, ch, -size / 2, -size / 2, size, size);
  }
  ctx.globalAlpha = alpha;
}

export function drawSpaceEffects(ctx: CanvasRenderingContext2D, images: Record<SpaceEffectKind, HTMLImageElement>, floors: number, time: number, width: number, height: number, reduced: boolean, drawBird: (zone: number, index: number, time: number, size: number) => void, cameraFloors = floors) {
  for (const layer of spaceEffectLayers(floors)) {
    if (layer.alpha < 0.005) continue;
    const frame = spaceSceneryTransform(layer.zone, cameraFloors, width, height);
    const cover = Math.max(width / 864, height / 1536);
    const baseW = 864 * cover, baseH = 1536 * cover;
    const sceneryScale = frame.width / baseW;
    for (const effect of SPACE_EFFECTS[layer.zone] ?? []) for (let i = 0; i < effect.count; i++) {
      const m = spaceEffectMotion(effect.kind, i, time, width, height, reduced);
      const alpha = layer.alpha * effect.alpha * m.alpha;
      if (alpha < 0.005) continue;
      const anchor = spaceMaterialAnchor(effect.kind, i, width, height);
      const size = anchor ? anchor.size * sceneryScale : effect.size * ("scale" in m ? m.scale ?? 1 : 1);
      const x = anchor?.x ?? m.x, y = anchor?.y ?? m.y;
      const sceneX = frame.x + (x - (width - baseW) / 2) * sceneryScale;
      const sceneY = frame.y + (y - (height - baseH) / 2) * sceneryScale;
      ctx.save(); ctx.globalAlpha = alpha;
      if (anchor) ctx.globalCompositeOperation = anchor.blend;
      ctx.translate(sceneX, sceneY); ctx.rotate(anchor?.angle ?? m.angle);
      if (m.mirror) ctx.scale(-1, 1);
      if (effect.kind === "bird") drawBird(layer.zone, i, reduced ? 0 : time, effect.size);
      else drawSpacePose(ctx, images[effect.kind], effect.kind, reduced ? 0 : effect.kind === "lightning" ? spaceLightningClock(time) : time, i, size);
      ctx.restore();
    }
  }
}