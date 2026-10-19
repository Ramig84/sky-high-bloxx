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
export type SpiritKind = "gull" | "butterfly" | "leaf" | "steam" | "lantern" | WanderKind;
/** Signature creatures with free, randomly wandering flight (approved painted pose sheets). */
export type WanderKind = "dragonfly" | "pigeon" | "swallow" | "firefly" | "eagle";
export type DistrictSpirit = { kind: SpiritKind; count: number; companion?: { kind: SpiritKind; count: number } };
export const DISTRICT_SPIRIT: Record<DistrictId, DistrictSpirit> = {
  oldtown: { kind: "leaf", count: 5 }, harbour: { kind: "gull", count: 4 }, market: { kind: "lantern", count: 4 },
  riverside: { kind: "dragonfly", count: 4 }, gardens: { kind: "butterfly", count: 5 }, university: { kind: "leaf", count: 4 },
  railyard: { kind: "steam", count: 6, companion: { kind: "pigeon", count: 3 } }, downtown: { kind: "swallow", count: 4 },
  skyline: { kind: "firefly", count: 7 }, cloudpeak: { kind: "eagle", count: 2 },
};
/** Every creature drawn for a district (main spirit plus an optional companion). */
export function districtSpirits(id: DistrictId) {
  const s = DISTRICT_SPIRIT[id];
  return s.companion ? [{ kind: s.kind, count: s.count }, s.companion] : [{ kind: s.kind, count: s.count }];
}
export const WANDER_KINDS: readonly WanderKind[] = ["dragonfly", "pigeon", "swallow", "firefly", "eagle"];
const isWander = (k: SpiritKind): k is WanderKind => (WANDER_KINDS as readonly string[]).includes(k);
/** Spirits accompany the whole climb: present from the street and thinning only in the high sky. */
export function spiritPresence(kind: SpiritKind, altitude: number) {
  const tops: Partial<Record<SpiritKind, number>> = { lantern: 4200, gull: 2600, dragonfly: 2600, pigeon: 3000, swallow: 3600, firefly: 5200, eagle: 9000 };
  const top = tops[kind] ?? 2000;
  return 1 - skyBlend(altitude, top - 600, top);
}

const rand = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const catmull = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
type WanderCfg = { dur: number; hover: boolean; x: [number, number]; y: [number, number]; dart: boolean; tilt: number };
const WANDER: Record<WanderKind, WanderCfg> = {
  dragonfly: { dur: 2.6, hover: true, x: [0.22, 0.46], y: [0.24, 0.58], dart: true, tilt: 0.25 },
  firefly: { dur: 4.2, hover: true, x: [0.2, 0.47], y: [0.16, 0.62], dart: false, tilt: 0.15 },
  swallow: { dur: 1.7, hover: false, x: [-0.12, 1.12], y: [0.07, 0.4], dart: false, tilt: 0.55 },
  pigeon: { dur: 2.8, hover: false, x: [-0.1, 1.1], y: [0.1, 0.36], dart: false, tilt: 0.35 },
  eagle: { dur: 5.2, hover: false, x: [-0.15, 1.15], y: [0.14, 0.38], dart: false, tilt: 0.3 },
};
/** Random waypoint i,k for a creature: hoverers keep to their own side lane; birds roam the upper sky band. */
function waypoint(kind: WanderKind, i: number, k: number, vw: number, vh: number) {
  const c = WANDER[kind], seed = WANDER_KINDS.indexOf(kind) * 31 + i * 7.3;
  const rx = rand(seed, k), ry = rand(seed + 3.1, k * 1.7 + 0.4);
  if (c.hover) {
    const side = i % 2 ? -1 : 1;
    return [vw * (0.5 + side * (c.x[0] + rx * (c.x[1] - c.x[0]))), vh * (c.y[0] + ry * (c.y[1] - c.y[0]))];
  }
  return [vw * (c.x[0] + rx * (c.x[1] - c.x[0])), vh * (c.y[0] + ry * (c.y[1] - c.y[0]))];
}
function wanderPoint(kind: WanderKind, i: number, t: number, vw: number, vh: number) {
  const c = WANDER[kind], dur = c.dur * (0.8 + rand(i, 9.1) * 0.45);
  const p = t / dur + rand(i, 2.2) * 50, k = Math.floor(p);
  let u = p - k;
  // Dragonflies hover with a tremble, then dart quickly to a new random perch.
  if (c.dart) { const d = Math.max(0, Math.min(1, (u - 0.62) / 0.38)); u = d * d * (3 - 2 * d); }
  const a = waypoint(kind, i, k - 1, vw, vh), b = waypoint(kind, i, k, vw, vh), q = waypoint(kind, i, k + 1, vw, vh), r = waypoint(kind, i, k + 2, vw, vh);
  let x = catmull(a[0]!, b[0]!, q[0]!, r[0]!, u), y = catmull(a[1]!, b[1]!, q[1]!, r[1]!, u);
  if (c.hover) { x += Math.sin(t * 7.3 + i * 2) * (c.dart ? 2.2 : 3.5); y += Math.sin(t * 5.1 + i) * (c.dart ? 2 : 4); }
  if (kind === "swallow") y += Math.sin(t * 2.4 + i * 1.3) * vh * 0.025;
  return { x, y };
}
/** Free flight with headings that change at random: no creature keeps one direction. */
export function wanderMotion(kind: WanderKind, i: number, t: number, vw: number, vh: number): SpiritState {
  const c = WANDER[kind], p = wanderPoint(kind, i, t, vw, vh), n = wanderPoint(kind, i, t + 0.08, vw, vh);
  const vx = n.x - p.x, vy = n.y - p.y, speed = Math.hypot(vx, vy);
  // Hoverers turn to face the side of the screen they belong to when nearly still, so they never flicker.
  const flip = speed < 0.4 && c.hover ? (i % 2 ? 1 : -1) : vx < 0 ? -1 : 1;
  const ang = Math.max(-c.tilt, Math.min(c.tilt, Math.atan2(vy, Math.abs(vx) + 0.001)));
  const rot = (c.hover && speed < 0.4 ? Math.sin(t * 1.3 + i) * 0.06 : ang) * flip;
  let flap = 1;
  if (kind === "eagle") flap = ((t + i * 2.9) % 7 + 7) % 7 < 1.9 ? 1 : 0;
  else if (kind === "pigeon" || kind === "swallow") flap = vy > speed * 0.35 ? 0 : 1;
  const edge = Math.min(p.x + vw * 0.06, vw * 1.06 - p.x) / (vw * 0.08);
  const alpha = c.hover ? 1 : Math.max(0, Math.min(1, edge));
  return { x: p.x, y: p.y, rot, flip, flap, scale: kind === "eagle" ? 0.85 + (i % 2) * 0.3 : 0.85 + (i % 3) * 0.15, alpha };
}

/**
 * Living sky per district, drawn in fixed layers (back to front):
 *  1 painted sky  ->  2 cloud light (glow pools breathing over the painted clouds)
 *  3 weather (rays / mist / twinkle / aurora wave)  ->  4 city + tower  ->  5 spirits at the edges.
 * Spirit tint carries the district palette onto the shared painted creature (rgb + strength).
 */
export type SkyWeather = "rays" | "mist" | "twinkle" | "aurora";
export type DistrictAtmos = { glow: [number, number, number]; weather: SkyWeather[]; tint: [number, number, number, number] };
export const DISTRICT_ATMOS: Record<DistrictId, DistrictAtmos> = {
  oldtown:    { glow: [255, 214, 150], weather: ["rays"],            tint: [214, 132, 52, 0.4] },
  harbour:    { glow: [235, 248, 255], weather: ["mist"],            tint: [0, 0, 0, 0] },
  market:     { glow: [255, 176, 96],  weather: ["rays"],            tint: [214, 64, 44, 0.45] },
  riverside:  { glow: [220, 240, 230], weather: ["mist", "rays"],    tint: [96, 150, 70, 0.45] },
  gardens:    { glow: [255, 210, 235], weather: ["mist"],            tint: [236, 128, 178, 0.45] },
  university: { glow: [240, 246, 255], weather: ["rays"],            tint: [150, 70, 40, 0.45] },
  railyard:   { glow: [255, 196, 120], weather: ["rays", "mist"],    tint: [0, 0, 0, 0] },
  downtown:   { glow: [255, 160, 170], weather: ["twinkle"],         tint: [255, 168, 60, 0.4] },
  skyline:    { glow: [170, 190, 255], weather: ["twinkle"],         tint: [150, 190, 255, 0.45] },
  cloudpeak:  { glow: [255, 190, 210], weather: ["aurora", "twinkle"], tint: [168, 120, 230, 0.45] },
};

/** Glow pool i: stays in place, slowly swells and dims so painted clouds look lit by moving light. */
export function cloudGlow(i: number, t: number, vw: number, vh: number) {
  const seed = (i * 97.3) % 1;
  const side = i % 2 === 0 ? 0.18 : 0.82;
  return {
    x: vw * (side + 0.08 * Math.sin(i * 2.1)), y: vh * (0.18 + ((i * 0.23) % 0.62)),
    r: vw * (0.32 + 0.1 * Math.sin(t * 0.21 + i * 1.7)),
    a: 0.5 + 0.5 * Math.sin(t * (0.17 + seed * 0.08) + i * 2.4),
  };
}

/** Twinkling star i: fixed position, its own pulse. */
export function twinkle(i: number, t: number, vw: number, vh: number) {
  const x = ((i * 0.6180339) % 1) * vw, y = ((i * 0.4142135) % 1) * vh * 0.7;
  return { x, y, a: Math.max(0, Math.sin(t * (0.8 + (i % 5) * 0.23) + i * 3.1)) ** 3, r: 0.8 + (i % 3) * 0.5 };
}
export type SpiritState = { x: number; y: number; rot: number; flip: number; flap: number; scale: number; alpha: number };
/** Deterministic motion for spirit i at time t on a vw x vh screen. Always keeps the centre lane clear. */
export function spiritMotion(kind: SpiritKind, i: number, t: number, vw: number, vh: number): SpiritState {
  if (isWander(kind)) return wanderMotion(kind, i, t, vw, vh);
  const side = i % 2 ? -1 : 1, ph = i * 1.73, lane = vw / 2 + side * vw * (0.3 + (i % 3) * 0.06);
  const loop = (period: number) => (((t + ph * period / 6.28) / period) % 1 + 1) % 1;
  if (kind === "gull") {
    const flight = birdPath(i, t * 0.78, vw, vh, 0.18, 0.28);
    return { x: flight.x, y: flight.y, rot: flight.mirror ? -flight.rot : flight.rot,
      flip: flight.mirror ? -1 : 1, flap: flight.pose === 5 ? 0 : 1,
      scale: flight.scale, alpha: 1 };
  }
  if (kind === "butterfly") {
    // Enter from the sky edge, explore a winding arc, then leave above the frame.
    const period = 19 + (i % 4) * 3, k = loop(period);
    const bend = k * Math.PI * 4 + ph, envelope = Math.sin(k * Math.PI);
    return { x: vw / 2 + side * (vw * (0.55 - 0.22 * envelope) + 9 * envelope * Math.sin(bend)),
      y: vh * (0.28 + (i % 3) * 0.075 + 0.17 * Math.sin(k * Math.PI)) - skyBlend(k, 0.68, 1) * vh * 0.8,
      rot: Math.sin(bend) * 0.16, flip: -side,
      flap: 0.5 + 0.5 * Math.sin(t * 13 + ph), scale: 0.8 + (i % 2) * 0.3,
      alpha: skyBlend(k, 0, 0.07) * (1 - skyBlend(k, 0.93, 1)) };
  }
  if (kind === "leaf") {
    const k = loop(11 + i * 1.5);
    return { x: lane + Math.sin(k * Math.PI * 3 + ph) * vw * 0.045, y: -40 + k * (vh * 0.76 + 40), rot: Math.sin(k * Math.PI * 3 + ph) * 0.38,
      flip: Math.cos(t * 2.2 + ph), flap: 0, scale: 0.7 + (i % 3) * 0.2, alpha: Math.min(1, Math.sin(k * Math.PI) * 3) };
  }
  if (kind === "steam") {
    const k = loop(9 + (i % 3)), sx = vw / 2 + side * vw * (0.36 + (i % 3) * 0.04);
    return { x: sx + Math.sin(k * 5 + ph) * 7 + side * k * 12, y: vh * 0.43 - k * vh * 0.19, rot: k * side * 0.12, flip: 1, flap: 0,
      scale: 0.5 + k * 0.65, alpha: Math.sin(k * Math.PI) ** 2 * 0.28 };
  }
  const k = loop(26 + i * 3);
  // Lanterns enter from a roof-height side lane, never through the pavement or HUD.
  return { x: vw / 2 + side * (vw * (0.58 - 0.22 * Math.sin(k * Math.PI)) + Math.sin(k * Math.PI * 3 + ph) * 5),
    y: vh * (0.48 + (i % 3) * 0.035 - k * 0.62), rot: Math.sin(t * 0.35 + ph) * 0.035, flip: 1,
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
  downtown:   { wash: [255, 190, 110], washAlpha: 0.17, life: "none", lifeCount: 0, birds: { count: 2, size: 1, speed: 1 }, cloudShade: 0.15, aurora: 0, stars: 0, cloudOffset: 0 },
  skyline:    { wash: [120, 140, 210], washAlpha: 0.16, life: "none", lifeCount: 0, birds: { count: 1, size: 1, speed: 1 }, cloudShade: 0.2, aurora: 0.35, stars: 0.6, cloudOffset: 0 },
  cloudpeak:  { wash: [245, 175, 175], washAlpha: 0.16, life: "none", lifeCount: 0, birds: { count: 2, size: 1, speed: 0.8 }, cloudShade: 0, aurora: 0.85, stars: 0.4, cloudOffset: 500 },
};

/** Aurora and stars glow in once the sky darkens (or immediately on night districts). */
export function highSkyGlow(altitude: number, strength: number, night: boolean) {
  return strength * Math.max(night ? 0.6 : 0, skyBlend(altitude, 1800, 3000));
}

export type SkyVisitor = { wy: number; lane: number; depth: number; phase: number; size: number };
/** Local object travel plus camera depth; authored poses still provide the material/wing motion. */
export function visitorMotion(kind: Exclude<SkyLife, "none">, v: SkyVisitor, t: number, altitude: number, vw: number, vh: number, reduced = false) {
  const baseY = cloudScreenY(v.wy, altitude, v.depth, 230), side = Math.sign(v.lane);
  if (reduced) return { x: vw / 2 + v.lane * vw, y: baseY, rot: 0, alpha: 1 };
  const period = kind === "balloon" ? 42 + v.phase * 2 : 27 + v.phase;
  const k = (((t + v.phase * 5) / period) % 1 + 1) % 1;
  const bend = k * Math.PI * 2 + v.phase;
  if (kind === "balloon") return {
    x: vw / 2 + side * vw * (0.36 + 0.07 * Math.sin(bend)),
    y: baseY + vh * (0.38 - k * 0.76), rot: 0.035 * Math.sin(bend * 2),
    alpha: skyBlend(k, 0, 0.08) * (1 - skyBlend(k, 0.92, 1)),
  };
  // A tethered kite sweeps a broad wind-driven arc, banking as it changes direction.
  return { x: vw / 2 + side * vw * (0.37 + 0.075 * Math.sin(bend) + 0.012 * Math.sin(t * 1.1 + v.phase)),
    y: baseY + vh * 0.17 * Math.cos(bend) + 8 * Math.sin(t * 0.7 + v.phase),
    rot: side * (0.12 * Math.cos(bend) + 0.045 * Math.sin(t * 1.1 + v.phase)), alpha: 1 };
}
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

export type BirdState = { x: number; y: number; rot: number; pose: number; mirror: boolean; scale: number };
/** Keep the wing stroke clock continuous when a flight switches between beats and glides. */
export function birdWingPose(time: number, phase: number, climbing: boolean) {
  const clock = Math.max(0, time + phase);
  const burst = clock % 4.8;
  return climbing || burst < 1.5 ? ([0, 1, 2, 3, 2, 1][Math.floor(clock * 8) % 6] ?? 2) : 5;
}

/** Reduced motion keeps painted birds visible, but entirely still and clear of the centre. */
export function restingBird(i: number, vw: number, vh: number, top = 0.14, band = 0.18): BirdState {
  const side = i % 2 ? -1 : 1;
  return { x: vw * (side > 0 ? 0.86 : 0.14), y: vh * (Math.max(top, 0.2) + band * ((i * 0.37) % 1)),
    rot: 0, pose: 5, mirror: side > 0, scale: 0.65 + (i % 3) * 0.12 };
}
/**
 * Natural bird flight shared by every screen. Each cycle a bird takes one of two routes on its
 * own side of the sky: (A) swoop in from the side edge, soar with rising and falling glides,
 * then climb out above; (B) dive in from above, pull up into a level glide and sail out the
 * side edge. Facing only changes offscreen between cycles; the centre lane stays clear.
 */
export function birdPath(i: number, t: number, vw: number, vh: number, top = 0.12, band = 0.2): BirdState {
  const side = i % 2 ? -1 : 1, ph = i * 2.37;
  const period = 24 + (i % 3) * 4.5;
  const startY = vh * (Math.max(top, 0.2) + band * ((i * 0.37) % 1));
  const at = (time: number) => {
    const raw = (time + ph * 3) / period, cycle = Math.floor(raw), k = raw - cycle;
    const route = ((cycle + i) % 2 + 2) % 2;
    if (route === 0) {
      const travel = skyBlend(k, 0, 1);
      const x = vw / 2 + side * (vw / 2 + 35 - travel * vw * 0.31);
      const y = startY + Math.sin(k * Math.PI * 2.6 + i) * vh * 0.07 - skyBlend(k, 0.64, 1) * (startY + 60);
      return { x, y, inward: true };
    }
    const x = vw / 2 + side * (vw * 0.3 + skyBlend(k, 0.12, 1) * (vw * 0.2 + 40));
    const low = startY + vh * 0.09;
    const y = -60 + (low + 60) * skyBlend(k, 0, 0.42) - vh * 0.09 * skyBlend(k, 0.42, 0.75)
      + Math.sin(k * Math.PI * 3 + i) * vh * 0.02 * skyBlend(k, 0.3, 0.6);
    return { x, y, inward: false };
  };
  const a = at(t), b = at(t + 0.001);
  const dx = b.x - a.x, dy = b.y - a.y;
  const climbing = dy / 0.001 < -3;
  const pose = birdWingPose(t, ph, climbing);
  const rot = Math.max(-0.3, Math.min(0.3, Math.atan2(dy, Math.abs(dx) + 0.00001) * 0.22));
  return { x: a.x, y: a.y, rot, pose, mirror: a.inward ? side > 0 : side < 0, scale: 0.65 + (i % 3) * 0.12 };
}
