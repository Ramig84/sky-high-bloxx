import { spaceSkyMix, zoneAt } from "./spaceClimb";

export type SpaceEffectKind = "bird" | "cloud" | "aurora" | "lightning" | "debris" | "lunarDust" | "marsDust" | "asteroid" | "stormBand" | "ringIce" | "nebula" | "comet";
export type SpaceEffect = { kind: SpaceEffectKind; count: number; size: number; alpha: number };

/** Each scene has its own authored material/creature vocabulary, never Earth wildlife in space. */
export const SPACE_EFFECTS: readonly (readonly SpaceEffect[])[] = [
  [{ kind: "bird", count: 2, size: 35, alpha: 0.8 }],
  [{ kind: "cloud", count: 3, size: 140, alpha: 0.44 }, { kind: "bird", count: 1, size: 42, alpha: 0.66 }],
  [{ kind: "cloud", count: 2, size: 150, alpha: 0.24 }, { kind: "aurora", count: 1, size: 210, alpha: 0.26 }, { kind: "lightning", count: 1, size: 120, alpha: 0.6 }],
  [{ kind: "aurora", count: 1, size: 180, alpha: 0.17 }],
  [{ kind: "debris", count: 3, size: 32, alpha: 0.58 }],
  [{ kind: "lunarDust", count: 2, size: 110, alpha: 0.45 }, { kind: "debris", count: 1, size: 25, alpha: 0.42 }],
  [{ kind: "marsDust", count: 2, size: 105, alpha: 0.52 }],
  [{ kind: "asteroid", count: 4, size: 38, alpha: 0.64 }],
  [{ kind: "stormBand", count: 2, size: 155, alpha: 0.44 }],
  [{ kind: "ringIce", count: 4, size: 26, alpha: 0.6 }],
  [{ kind: "nebula", count: 2, size: 155, alpha: 0.22 }, { kind: "comet", count: 1, size: 70, alpha: 0.65 }],
];

export function spaceEffectLayers(floors: number) {
  const mix = spaceSkyMix(floors);
  return mix.from === mix.to
    ? [{ zone: mix.from, alpha: 1 }]
    : [{ zone: mix.from, alpha: 1 - mix.t }, { zone: mix.to, alpha: mix.t }];
}

/** Stable varied speeds/phases, with whole-pose action independent of travel. Keep the stacking lane clear. */
export function spaceEffectMotion(kind: SpaceEffectKind, index: number, time: number, width: number, height: number, reduced = false) {
  const t = reduced ? 0 : Math.max(0, time), phase = index * 2.399;
  const side = index % 2 === 0 ? -1 : 1;
  const edge = width * (side < 0 ? 0.12 : 0.88);
  const y0 = height * (0.29 + (index % 3) * 0.17);
  if (kind === "bird") {
    const duration = 19 + index * 3;
    const k = reduced ? 0.18 + index * 0.62 : ((t + index * 7) % duration) / duration;
    return { x: (side < 0 ? k : 1 - k) * (width + 100) - 50, y: height * 0.32 + Math.sin(k * Math.PI * 2 + phase) * 18, alpha: Math.min(1, k * 8, (1 - k) * 8), mirror: side > 0, angle: 0 };
  }
  if (kind === "comet") {
    const k = (t % 32) / 32;
    // A rare distant diagonal crossing; no vertical elevator path.
    return { x: -90 + k * (width + 180), y: height * 0.37 - k * 55, alpha: reduced ? 0.4 : Math.min(1, k * 10, (1 - k) * 10), mirror: false, angle: -0.14 };
  }
  const atmosphere = ["cloud", "aurora", "stormBand", "nebula", "lightning"].includes(kind);
  const ice = kind === "ringIce";
  const lightningPhase = t % 13;
  return {
    x: edge + (atmosphere ? 0 : Math.sin(t * (0.12 + index * 0.019) + phase) * width * 0.055),
    y: kind === "aurora" ? height * 0.3 : ice ? height * (0.46 + index * 0.045) + Math.sin(t * 0.16 + phase) * 12 : y0 + (atmosphere ? 0 : Math.cos(t * 0.13 + phase) * 15),
    alpha: kind === "lightning" ? (reduced || lightningPhase > 1.15 ? 0 : Math.sin(lightningPhase / 1.15 * Math.PI) * 0.8) : 0.9,
    mirror: side > 0,
    angle: ice ? -0.3 : 0,
  };
}

export type HazardKind = "debris" | "asteroid" | "ringIce" | "comet";
export type SpaceHazard = { kind: HazardKind; started: number; direction: -1 | 1; y: number; duration: number; size: number };
export const SPACE_WARNING_SECONDS = 2.4;

/** Single, sparse, warned lane crossing. Dust/weather are visual; only these solid visitors hit a dropped block. */
export function spaceHazardConfig(floors: number): { kind: HazardKind; interval: number; duration: number; size: number } | null {
  const z = zoneAt(floors);
  if (z < 4) return null;
  const kind: HazardKind = z === 7 || z === 8 ? "asteroid" : z === 9 ? "ringIce" : z === 10 ? "comet" : "debris";
  return { kind, interval: z >= 7 ? 14 : 18, duration: z >= 7 ? 4 : 5, size: z === 10 ? 52 : z >= 7 ? 38 : 30 };
}

export function spaceHazardPosition(hazard: SpaceHazard, time: number, width: number) {
  const age = time - hazard.started;
  const progress = (age - SPACE_WARNING_SECONDS) / hazard.duration;
  return { x: hazard.direction * (-width / 2 - hazard.size + (width + hazard.size * 2) * Math.max(0, Math.min(1, progress))), y: hazard.y,
    warning: age >= 0 && age < SPACE_WARNING_SECONDS, active: progress >= 0 && progress < 1, done: progress >= 1 };
}

export type Point = { x: number; y: number };
/** Relative swept segment vs expanded block box: catches crossings between frames at any display rate. */
export function spaceHazardHits(h0: Point, h1: Point, b0: Point, b1: Point, halfWidth: number, halfHeight: number, radius: number) {
  const start = { x: h0.x - b0.x, y: h0.y - b0.y }, end = { x: h1.x - b1.x, y: h1.y - b1.y };
  let enter = 0, exit = 1;
  for (const [a, b, extent] of [[start.x, end.x, halfWidth + radius], [start.y, end.y, halfHeight + radius]]) {
    if (a === undefined || b === undefined || extent === undefined) return false;
    const delta = b - a;
    if (Math.abs(delta) < 1e-9) { if (Math.abs(a) > extent) return false; continue; }
    const t0 = (-extent - a) / delta, t1 = (extent - a) / delta;
    enter = Math.max(enter, Math.min(t0, t1)); exit = Math.min(exit, Math.max(t0, t1));
    if (enter > exit) return false;
  }
  return true;
}