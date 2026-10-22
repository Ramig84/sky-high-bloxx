import { spaceSkyLayers, zoneAt } from "./spaceClimb";

export type SpaceEffectKind = "bird" | "cloud" | "aurora" | "lightning" | "debris" | "lunarDust" | "marsDust" | "asteroid" | "stormBand" | "ringIce" | "nebula" | "comet";
export type SpaceEffect = { kind: SpaceEffectKind; count: number; size: number; alpha: number };

/** Each scene has its own authored material/creature vocabulary, never Earth wildlife in space. */
export const SPACE_EFFECTS: readonly (readonly SpaceEffect[])[] = [
  [{ kind: "bird", count: 2, size: 35, alpha: 0.8 }],
  [{ kind: "cloud", count: 2, size: 170, alpha: 0.18 }, { kind: "bird", count: 1, size: 42, alpha: 0.66 }],
  [{ kind: "cloud", count: 2, size: 165, alpha: 0.14 }, { kind: "aurora", count: 1, size: 210, alpha: 0.26 }, { kind: "lightning", count: 1, size: 120, alpha: 0.6 }],
  [{ kind: "aurora", count: 1, size: 180, alpha: 0.17 }],
  [{ kind: "debris", count: 3, size: 32, alpha: 0.58 }],
  [{ kind: "lunarDust", count: 1, size: 58, alpha: 0.16 }, { kind: "debris", count: 1, size: 25, alpha: 0.42 }],
  [{ kind: "marsDust", count: 1, size: 68, alpha: 0.22 }],
  [{ kind: "asteroid", count: 4, size: 38, alpha: 0.64 }],
  [{ kind: "stormBand", count: 1, size: 115, alpha: 0.19 }],
  [{ kind: "ringIce", count: 4, size: 26, alpha: 0.6 }],
  [{ kind: "nebula", count: 2, size: 220, alpha: 0.09 }, { kind: "comet", count: 1, size: 70, alpha: 0.65 }],
];

export function spaceEffectLayers(floors: number) {
  const layers = spaceSkyLayers(floors);
  const top = layers[1];
  return layers.map((layer, i) => ({ zone: layer.zone, alpha: i === 0 && top ? 1 - top.alpha : layer.alpha }));
}

/** Stable varied speeds/phases, with whole-pose action independent of travel. Keep the stacking lane clear. */
export function spaceEffectMotion(kind: SpaceEffectKind, index: number, time: number, width: number, height: number, reduced = false) {
  const t = reduced ? 0 : Math.max(0, time), phase = index * 2.399;
  const side = index % 2 === 0 ? -1 : 1;
  const edge = width * (side < 0 ? 0.12 : 0.88);
  const y0 = height * (0.29 + (index % 3) * 0.17);
  if (["debris", "asteroid", "ringIce"].includes(kind)) {
    // Varied diagonal depth routes with offscreen turns, clear of the central stacking lane.
    const duration = 34 + index * 7;
    const pass = Math.floor((t + index * 11.7) / duration);
    const k = reduced ? 0.35 + index * 0.08 : ((t + index * 11.7) % duration) / duration;
    const depth = 0.65 + (index % 3) * 0.17;
    const upwards = (pass + index) % 2 === 1;
    const travel = upwards ? 1 - k : k;
    const lane = side < 0 ? 0.09 : 0.91;
    const diagonal = (k - 0.5) * 0.12 * (pass % 2 === 0 ? 1 : -1);
    return { x: width * (lane + diagonal + Math.sin(k * Math.PI * 2 + phase) * 0.018),
      y: -70 + travel * (height + 140), alpha: Math.min(1, k * 10, (1 - k) * 10) * depth,
      mirror: side > 0, angle: kind === "ringIce" ? -0.3 : 0, scale: depth };
  }
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
  const lightningPhase = spaceLightningClock(t);
  return {
    x: edge + (atmosphere ? 0 : Math.sin(t * (0.12 + index * 0.019) + phase) * width * 0.055),
    y: kind === "aurora" ? height * 0.3 : kind === "cloud" ? height * (0.57 + index * 0.15) : y0 + (atmosphere ? 0 : Math.cos(t * 0.13 + phase) * 15),
    alpha: kind === "lightning" ? (reduced || lightningPhase > 1.15 ? 0 : Math.sin(lightningPhase / 1.15 * Math.PI) * 0.8) : 0.9,
    mirror: side > 0,
    angle: 0,
  };
}

/** Coordinates in the approved 864×1536 paintings, mapped through the same cover crop as the sky. */
export function spaceMaterialAnchor(kind: SpaceEffectKind, index: number, width: number, height: number) {
  const cover = Math.max(width / 864, height / 1536), w = 864 * cover, h = 1536 * cover;
  const point = (x: number, y: number) => ({ x: (width - w) / 2 + x * w, y: (height - h) / 2 + y * h });
  if (kind === "lunarDust") return { ...point(0.64, 0.19), size: w * 0.16, angle: -0.4, blend: "soft-light" as const };
  if (kind === "marsDust") return { ...point(0.64, 0.23), size: w * 0.2, angle: -0.4, blend: "multiply" as const };
  if (kind === "stormBand") return { ...point(0.74, 0.87), size: w * 0.42, angle: -0.12, blend: "soft-light" as const };
  if (kind === "nebula") return { ...point(index === 0 ? 0.06 : 0.93, index === 0 ? 0.34 : 0.49), size: w * 0.78, angle: index === 0 ? -0.6 : 0.4, blend: "soft-light" as const };
  return null;
}

/** Render-only easing; never selects rules or awards floors. The simulation's zero dt freezes it. */
export function advanceSpacePresentation(current: number, earned: number, dt: number) {
  if (earned < current) return Math.max(0, earned);
  return current + (earned - current) * (1 - Math.exp(-Math.max(0, dt) * 2.4));
}

export function spaceHazardPoseTime(hazard: SpaceHazard, time: number, reduced = false) {
  return reduced ? 0 : Math.max(0, time - hazard.started);
}

export type HazardKind = "debris" | "asteroid" | "ringIce" | "comet";
export type SpaceHazard = { kind: HazardKind; started: number; direction: -1 | 1; y: number; duration: number; size: number };
export const SPACE_WARNING_SECONDS = 2.4;
export type HazardSchedule = { next: number | null; sequence: number; hazard: SpaceHazard | null };
export const freshSpaceHazards = (): HazardSchedule => ({ next: null, sequence: 0, hazard: null });

export function stepSpaceHazards(state: HazardSchedule, floors: number, time: number, laneY: number): HazardSchedule {
  const config = spaceHazardConfig(floors);
  if (!config) return freshSpaceHazards();
  if (state.hazard) {
    if (time < state.hazard.started + SPACE_WARNING_SECONDS + state.hazard.duration) return state;
    return { ...state, hazard: null, next: time + config.interval };
  }
  if (state.next === null) return { ...state, next: time + config.interval };
  if (time < state.next) return state;
  return { next: null, sequence: state.sequence + 1, hazard: { kind: config.kind, started: time, direction: state.sequence % 2 === 0 ? 1 : -1, y: laneY, duration: config.duration, size: config.size } };
}

/** A new landing cancels the old lane warning instead of teleporting a crossing to a new tower height. */
export function resetSpaceHazardLane(state: HazardSchedule, floors: number, time: number): HazardSchedule {
  const config = spaceHazardConfig(floors);
  return { ...state, hazard: null, next: config ? state.hazard ? time + config.interval : state.next ?? time + config.interval : null };
}

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
/** Deterministic irregular thunder cadence, shared by visibility and authored pose selection. */
export function spaceLightningClock(time: number) {
  let left = Math.max(0, time) % 91;
  for (const interval of [13, 18, 15, 20, 11, 14]) {
    if (left < interval) return left;
    left -= interval;
  }
  return left;
}
export const spaceHazardName = (kind: HazardKind) => ({ debris: "Debris", asteroid: "Asteroid", ringIce: "Ring ice", comet: "Comet" })[kind];
