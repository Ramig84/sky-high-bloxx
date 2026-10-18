// Loads and decodes every image/sound a screen needs before it is shown, so screens appear complete at once.
import roofSrc from "@/assets/roof-cap.webp";
import ambientSrc from "@/assets/ambient.webp";
import confettiSrc from "@/assets/painted-confetti.webp";
import windSrc from "@/assets/wind-poses.png";
import plaqueSrc from "@/assets/ui-plaque.webp";
import contactSrc from "@/assets/painted-ground-contact.webp";
import footingSrc from "@/assets/storybook-footing.webp";
import paperSrc from "@/assets/painted-paper.webp";
import { districtFloors, districtStreet, phoneArtwork, tabletArtwork } from "./artwork";
import { DISTRICTS, type DistrictId } from "./levels";
import { coin, SHOP_IMAGES } from "./shopArtwork";
import { DISTRICT_MUSIC, preloadSounds, type Sound } from "./audio";
import { SKY_IMAGES, districtSkyArt } from "./skyArtwork";
import { spiritArtwork } from "./spiritArtwork";
import { DISTRICT_SPIRIT } from "./sky";

const cache = new Map<string, HTMLImageElement>();
const ready = new Map<string, Promise<void>>();

/** Shared decoded image; the canvas reuses the same element so it is drawable on frame one. */
export function getImage(src: string) {
  let i = cache.get(src);
  if (!i) { i = new Image(); i.decoding = "async"; i.src = src; cache.set(src, i); }
  return i;
}
function loadImage(src: string) {
  if (!src) return Promise.resolve();
  let p = ready.get(src);
  if (!p) {
    const i = getImage(src);
    p = (i.decode ? i.decode() : new Promise<void>((res, rej) => { i.onload = () => res(); i.onerror = rej; })).catch(() => {});
    ready.set(src, p);
  }
  return p;
}

const isTablet = () => typeof window !== "undefined" && window.matchMedia("(min-width: 600px)").matches;
const art = () => (isTablet() ? tabletArtwork : phoneArtwork);

export type ScreenAssets = { images: string[]; sounds: Sound[] };

const UI_SOUNDS: Sound[] = ["tap", "birds", "music", "coins", "coinDing"];
const PLAY_SOUNDS: Sound[] = ["drop", "perfect", "miss", "release", "collapse", "clear", "wind", "rain", "night", "waves", "train", "city", "coins", "coinDing"];

export function homeAssets(): ScreenAssets {
  const a = art();
  return { images: [coin, paperSrc, districtStreet("oldtown", isTablet()), a.cloudSrc, a.birdSrc, a.hookSrc, a.b1, a.logoSrc, plaqueSrc], sounds: UI_SOUNDS };
}
export function mapAssets(): ScreenAssets {
  const a = art(), t = isTablet();
  return { images: [paperSrc, contactSrc, a.mapSrc, a.cloudSrc, a.birdSrc, a.logoSrc, plaqueSrc, ...DISTRICTS.flatMap(d => districtFloors(d.id, t))], sounds: UI_SOUNDS };
}
export function shopAssets(): ScreenAssets { return { images: [...SHOP_IMAGES, paperSrc, districtStreet("oldtown", isTablet())], sounds: ["tap", "music"] }; }
export function levelAssets(district: DistrictId, extras: string[] = []): ScreenAssets {
  const a = art(), t = isTablet();
  return {
    images: [coin, contactSrc, footingSrc, paperSrc, ...districtFloors(district, t), districtStreet(district, t), a.cloudsSrc, a.sunsetSrc, a.spaceSrc, a.hookSrc, a.craneSrc, a.cloudSrc,
      a.birdSrc, a.rainSrc, windSrc, confettiSrc, roofSrc, ambientSrc, ...SKY_IMAGES, districtSkyArt[district].low, districtSkyArt[district].high, spiritArtwork[DISTRICT_SPIRIT[district].kind], ...extras],
    sounds: [...PLAY_SOUNDS, DISTRICT_MUSIC[district], "tap"],
  };
}

/** Resolves when every asset is decoded; reports progress 0..1. */
export async function preload(list: ScreenAssets, onProgress?: (p: number) => void) {
  const jobs = [...list.images.map(loadImage), ...preloadSounds(list.sounds)];
  let done = 0;
  onProgress?.(0);
  await Promise.all(jobs.map(j => j.then(() => onProgress?.(++done / jobs.length))));
}
export { roofSrc, confettiSrc };
export function celebrateAssets(from: DistrictId, to: DistrictId | null): ScreenAssets {
  const a = art(), t = isTablet();
  return { images: [paperSrc, contactSrc, footingSrc, ambientSrc, districtStreet(from, t), a.cloudSrc, a.birdSrc, plaqueSrc, roofSrc, confettiSrc, ...districtFloors(from, t), ...(to ? [districtStreet(to, t), ...districtFloors(to, t)] : [])], sounds: [...UI_SOUNDS, "clear", "perfect"] };
}
