// Presentation-only atmosphere. These camera bands never affect floor rules or weather.
import type { DistrictId } from "./levels";

export function skyBlend(altitude: number, low: number, high: number) {
  const t = Math.max(0, Math.min(1, (altitude - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

/** Camera altitude is in world pixels; one floor is about 50. */
export function skyProfile(altitude: number) {
  return {
    street: 1 - skyBlend(altitude, 400, 900),
    sunset: skyBlend(altitude, 1200, 2000),
    space: skyBlend(altitude, 3000, 3800),
    districtLife: 1 - skyBlend(altitude, 500, 1100),
    birds: 1 - skyBlend(altitude, 1500, 2200),
    clouds: 1 - skyBlend(altitude, 3200, 3800),
    /** Thin high wisps start above the rooftops (about floor 6). */
    wisps: skyBlend(altitude, 280, 650),
    /** Full drifting clouds arrive around floor 16. */
    puffs: skyBlend(altitude, 700, 1100),
    /** The far city sinks into blue haze as the street falls away. */
    cityHaze: skyBlend(altitude, 250, 650) * (1 - skyBlend(altitude, 1400, 1900)),
    /** A sea of cloud tops below the tower from about floor 30. */
    cloudSea: skyBlend(altitude, 1350, 1850),
  };
}

export type CloudKind = "wisp" | "puff";
export type SkyCloud = { kind: CloudKind; wy: number; lane: number; depth: number; scale: number; drift: number };

/** Deterministic cloud field: far wisps and mid/near puffs, each anchored at a world height. */
export function cloudField(count = 18): SkyCloud[] {
  const out: SkyCloud[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: number) => { const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    const kind: CloudKind = i % 3 === 0 ? "wisp" : "puff";
    out.push({
      kind,
      wy: 420 + i * 190 + r(1) * 120,
      lane: (i % 2 ? 1 : -1) * (0.3 + r(2) * 0.22),
      depth: kind === "wisp" ? 0.18 + r(3) * 0.12 : 0.3 + (i % 3) * 0.22 + r(3) * 0.08,
      scale: 0.75 + r(4) * 0.6,
      drift: r(5) * 6.28,
    });
  }
  return out;
}

/** Repeats the field every `period` world pixels so endless towers keep clouds around the camera. */
export function cloudWorldY(wy: number, altitude: number, period = 3400) {
  if (altitude < wy + period / 2) return wy;
  return wy + period * Math.round((altitude - wy) / period);
}

/** Screen y for a world-anchored cloud: far clouds (small depth) move slower than the tower. */
export function cloudScreenY(wy: number, altitude: number, depth: number, horizon = 250) {
  return horizon + (altitude - wy) * depth;
}

/** How visible a cloud of this kind is at this altitude. Zero at street level, so clouds never sit on the ground. */
export function cloudDensity(kind: CloudKind, altitude: number) {
  const p = skyProfile(altitude);
  return (kind === "wisp" ? p.wisps : p.puffs) * p.clouds;
}

/** Legacy helper kept for callers: a repeating world band that recycles outside the screen. */
export function cloudHeight(worldHeight: number, altitude: number, depth: number, viewportHeight: number) {
  const margin = 180, band = viewportHeight + margin * 2;
  const screen = 534 - worldHeight + altitude * depth;
  return ((screen + margin) % band + band) % band - margin;
}

/** Flaps settle into an authored glide, rather than constantly beating in lockstep. */
export function birdFlight(time: number, phase: number) {
  const cycle = ((time + phase) % 5.6 + 5.6) % 5.6;
  const poses = [0, 1, 2, 3, 2, 1];
  return cycle < 1.8 ? (poses[Math.floor(cycle * 10) % poses.length] ?? 2) : 5;
}

export type SkyLife = "balloon" | "kite" | "none";
/** Animated district spirits: each moves with its own painted motion (flapping, tumbling, rising). */
export type SpiritKind = "gull" | "butterfly" | "leaf" | "steam" | "lantern";
export const DISTRICT_SPIRIT: Record<DistrictId, { kind: SpiritKind; count: number }> = {
  oldtown: { kind: "leaf", count: 5 }, harbour: { kind: "gull", count: 4 }, market: { kind: "lantern", count: 4 },
  riverside: { kind: "leaf", count: 6 }, gardens: { kind: "butterfly", count: 5 }, university: { kind: "leaf", count: 4 },
  railyard: { kind: "steam", count: 6 }, downtown: { kind: "lantern", count: 4 }, skyline: { kind: "lantern", count: 6 },
  cloudpeak: { kind: "butterfly", count: 4 },
};
/** Spirits accompany the whole climb: present from the street and thinning only in the high sky. */
export function spiritPresence(kind: SpiritKind, altitude: number) {
  const top = kind === "lantern" ? 4200 : kind === "gull" ? 2600 : 2000;
  return 1 - skyBlend(altitude, top - 600, top);
}
export type SpiritState = { x: number; y: number; rot: number; flip: number; flap: number; scale: number; alpha: number };
/** Deterministic motion for spirit i at time t on a vw x vh screen. Always keeps the centre lane clear. */
export function spiritMotion(kind: SpiritKind, i: number, t: number, vw: number, vh: number): SpiritState {
  const side = i % 2 ? -1 : 1, ph = i * 1.73, lane = vw / 2 + side * vw * (0.3 + (i % 3) * 0.06);
  const loop = (period: number) => (((t + ph * period / 6.28) / period) % 1 + 1) % 1;
  if (kind === "gull") {
    const k = loop(14 + i * 2), dir = side;
    return { x: vw / 2 + dir * (k - 0.5) * vw * 1.4, y: vh * (0.25 + (i % 4) * 0.12) + Math.sin(t * 0.7 + ph) * 12,
      rot: Math.sin(t * 0.7 + ph) * 0.08, flip: dir, flap: Math.max(0, Math.sin(t * 4.2 + ph)) * (Math.sin(t * 0.3 + ph) > -0.3 ? 1 : 0.15),
      scale: 0.8 + (i % 3) * 0.2, alpha: Math.min(1, Math.sin(k * Math.PI) * 4) };
  }
  if (kind === "butterfly") {
    return { x: lane + Math.sin(t * 0.5 + ph) * vw * 0.07 + Math.sin(t * 1.3 + ph) * 10, y: vh * (0.3 + (i % 4) * 0.15) + Math.sin(t * 0.8 + ph * 2) * 30,
      rot: Math.cos(t * 0.5 + ph) * 0.35, flip: 1, flap: 0.5 + 0.5 * Math.sin(t * 13 + ph), scale: 0.8 + (i % 2) * 0.3, alpha: 1 };
  }
  if (kind === "leaf") {
    const k = loop(11 + i * 1.5);
    return { x: lane + Math.sin(t * 1.1 + ph) * vw * 0.08, y: -40 + k * (vh + 80), rot: t * 0.9 + ph + Math.sin(t * 1.6) * 0.6,
      flip: Math.cos(t * 2.2 + ph), flap: 0, scale: 0.7 + (i % 3) * 0.2, alpha: Math.min(1, Math.sin(k * Math.PI) * 3) };
  }
  if (kind === "steam") {
    const k = loop(9 + (i % 3)), sx = vw / 2 + side * vw * (0.36 + (i % 3) * 0.04);
    return { x: sx + Math.sin(k * 5 + ph) * 14 + side * k * 30, y: vh * 1.02 - k * vh * 0.8, rot: k * side * 0.8, flip: 1, flap: 0,
      scale: 0.5 + k * 1.6, alpha: Math.sin(k * Math.PI) * 0.6 };
  }
  const k = loop(26 + i * 3);
  return { x: lane + Math.sin(t * 0.4 + ph) * 18, y: vh * 1.05 - k * vh * 1.15, rot: Math.sin(t * 0.9 + ph) * 0.07, flip: 1,
    flap: 0.7 + 0.3 * Math.abs(Math.sin(t * 6.1 + ph) * Math.sin(t * 2.3 + ph)), scale: 0.7 + (i % 3) * 0.2, alpha: Math.min(1, Math.sin(k * Math.PI) * 3) };
}

export type DistrictSky = {
  /** Soft painted light wash laid over the sky paintings. */
  wash: [number, number, number]; washAlpha: number;
  /** District sky visitors drifting between rooftops and the clouds. */
  life: SkyLife; lifeCount: number;
  /** Bird character: gulls are larger and slower, swallows small and quick. */
  birds: { count: number; size: number; speed: number };
  /** Cloud tint: warm cream to stormy grey. */
  cloudShade: number;
  aurora: number; stars: number;
  /** Cloud Peak starts already near the clouds. */
  cloudOffset: number;
};

export const DISTRICT_SKY: Record<DistrictId, DistrictSky> = {
  oldtown:    { wash: [255, 196, 150], washAlpha: 0.14, life: "balloon", lifeCount: 1, birds: { count: 3, size: 1, speed: 1 }, cloudShade: 0, aurora: 0, stars: 0, cloudOffset: 0 },
  harbour:    { wash: [150, 205, 215], washAlpha: 0.14, life: "none", lifeCount: 0, birds: { count: 5, size: 1.35, speed: 0.8 }, cloudShade: 0.05, aurora: 0, stars: 0, cloudOffset: 0 },
  market:     { wash: [255, 205, 120], washAlpha: 0.16, life: "kite", lifeCount: 2, birds: { count: 3, size: 1, speed: 1 }, cloudShade: 0, aurora: 0, stars: 0, cloudOffset: 0 },
  riverside:  { wash: [160, 200, 185], washAlpha: 0.14, life: "none", lifeCount: 0, birds: { count: 6, size: 0.7, speed: 1.7 }, cloudShade: 0.15, aurora: 0, stars: 0, cloudOffset: 0 },
  gardens:    { wash: [215, 185, 235], washAlpha: 0.15, life: "balloon", lifeCount: 2, birds: { count: 3, size: 0.8, speed: 1.2 }, cloudShade: 0, aurora: 0, stars: 0, cloudOffset: 0 },
  university: { wash: [200, 220, 245], washAlpha: 0.1, life: "kite", lifeCount: 1, birds: { count: 4, size: 1.1, speed: 0.9 }, cloudShade: 0.05, aurora: 0, stars: 0, cloudOffset: 0 },
  railyard:   { wash: [190, 170, 140], washAlpha: 0.18, life: "none", lifeCount: 0, birds: { count: 2, size: 1.1, speed: 0.9 }, cloudShade: 0.35, aurora: 0, stars: 0, cloudOffset: 0 },
  downtown:   { wash: [255, 190, 110], washAlpha: 0.17, life: "balloon", lifeCount: 1, birds: { count: 2, size: 1, speed: 1 }, cloudShade: 0.15, aurora: 0, stars: 0, cloudOffset: 0 },
  skyline:    { wash: [120, 140, 210], washAlpha: 0.16, life: "none", lifeCount: 0, birds: { count: 1, size: 1, speed: 1 }, cloudShade: 0.2, aurora: 0.35, stars: 0.6, cloudOffset: 0 },
  cloudpeak:  { wash: [245, 175, 175], washAlpha: 0.16, life: "none", lifeCount: 0, birds: { count: 2, size: 1, speed: 0.8 }, cloudShade: 0, aurora: 0.85, stars: 0.4, cloudOffset: 500 },
};

/** Aurora and stars glow in once the sky darkens (or immediately on night districts). */
export function highSkyGlow(altitude: number, strength: number, night: boolean) {
  return strength * Math.max(night ? 0.6 : 0, skyBlend(altitude, 1800, 3000));
}

export type SkyVisitor = { wy: number; lane: number; depth: number; phase: number; size: number };
/** District visitors (balloons, kites) float between rooftop height and the low clouds, at the side lanes. */
export function skyVisitors(count: number): SkyVisitor[] {
  return Array.from({ length: count }, (_, i) => ({
    wy: 520 + i * 420,
    lane: (i % 2 ? -1 : 1) * (0.34 + (i % 3) * 0.04),
    depth: 0.32 + (i % 2) * 0.1,
    phase: i * 2.1,
    size: i % 2 ? 26 : 34,
  }));
}

/** Opacity of each district's painted street sky and high sky at an altitude: crossfade slowly, never swap. */
export function districtSkyMix(altitude: number) {
  const up = skyBlend(altitude, 250, 2400); // slow fade across many floors, no sudden swap
  return { low: 1 - up, high: up };
}
