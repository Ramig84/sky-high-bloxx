import { describe, expect, it } from "vitest";
import { birdFlight, cloudHeight, cloudSeaTint, skyBlend, skyProfile } from "./sky";

describe("sea of clouds takes each district's light", () => {
  it("day districts wash the cloud sea blue, never pink", () => {
    for (const d of ["oldtown", "harbour", "market", "riverside", "gardens", "university"] as const) {
      const [r, , b] = cloudSeaTint(d);
      expect(b).toBeGreaterThan(r);
    }
  });
  it("night districts wash the cloud sea indigo", () => {
    for (const d of ["skyline", "cloudpeak"] as const) {
      const [r, , b] = cloudSeaTint(d);
      expect(b).toBeGreaterThan(r + 60);
    }
  });
  it("rain districts wash the cloud sea steel grey-blue", () => {
    for (const d of ["railyard", "downtown"] as const) {
      const [r, , b] = cloudSeaTint(d);
      expect(b).toBeGreaterThan(r);
      expect(b).toBeLessThan(210);
    }
  });
});

describe("presentation-only altitude journey", () => {
  it("retains the existing street, sunset and stratosphere altitude boundaries", () => {
    expect(skyProfile(400).street).toBe(1);
    expect(skyProfile(900).street).toBe(0);
    expect(skyProfile(1200).sunset).toBe(0);
    expect(skyProfile(2000).sunset).toBe(1);
    expect(skyProfile(3000).space).toBe(0);
    expect(skyProfile(3800).space).toBe(1);
  });
  it("leaves terrestrial life below the upper sky", () => {
    expect(skyProfile(500).districtLife).toBe(1);
    expect(skyProfile(1100).districtLife).toBe(0);
    expect(skyProfile(2200).birds).toBe(0);
    expect(skyProfile(3800).clouds).toBe(0);
  });
  it("eases continuously into both ends and preserves the midpoint", () => {
    expect(skyBlend(1600, 1200, 2000)).toBe(0.5);
    expect(skyBlend(1201, 1200, 2000)).toBeLessThan(0.00001);
    expect(1 - skyBlend(1999, 1200, 2000)).toBeLessThan(0.00001);
    expect(skyProfile(1600).sunset).toBeGreaterThan(skyProfile(1599).sunset);
  });
  it("replenishes painted clouds throughout ascent and descent, outside the viewport", () => {
    for (const altitude of [0, 800, 1600, 2400, 3200, 2400, 800, 0]) {
      const positions = [0, 1, 2, 3, 4].map(i => cloudHeight(260 + i * 212, altitude, 0.42, 700));
      expect(positions.filter(y => y >= 0 && y <= 700).length).toBeGreaterThanOrEqual(3);
      expect(positions.every(y => y >= -180 && y < 880)).toBe(true);
    }
    expect(cloudHeight(260, 0, 0.42, 700)).toBe(cloudHeight(260, 1060 / 0.42, 0.42, 700));
  });
  it("uses changing painted wing poses then a glide with independent phases", () => {
    expect(birdFlight(0, 0)).toBe(0);
    expect(birdFlight(0.35, 0)).toBe(3);
    expect(birdFlight(2, 0)).toBe(5);
    expect(birdFlight(0, 2)).toBe(5);
    expect(birdFlight(5.6, 0)).toBe(0);
  });
});
import { DISTRICT_SKY, cloudDensity, cloudField, cloudScreenY, cloudWorldY } from "./sky";
import { DISTRICTS } from "./levels";

describe("layered sky depth", () => {
  it("never shows clouds at street level (floors 1-5)", () => {
    for (const alt of [0, 100, 250]) {
      expect(cloudDensity("wisp", alt)).toBe(0);
      expect(cloudDensity("puff", alt)).toBe(0);
    }
  });
  it("brings thin wisps first (about floor 6+) and full clouds later (about floor 16+)", () => {
    expect(cloudDensity("wisp", 650)).toBe(1);
    expect(cloudDensity("puff", 650)).toBe(0);
    expect(cloudDensity("puff", 1100)).toBe(1);
  });
  it("moves far clouds slower than near clouds as the tower climbs", () => {
    const far = cloudScreenY(1000, 1200, 0.2) - cloudScreenY(1000, 1000, 0.2);
    const near = cloudScreenY(1000, 1200, 0.9) - cloudScreenY(1000, 1000, 0.9);
    expect(near).toBeGreaterThan(far * 4);
  });
  it("keeps clouds around the camera on very tall endless towers", () => {
    const wy = cloudWorldY(500, 9000);
    expect(Math.abs(wy - 9000)).toBeLessThanOrEqual(1700);
  });
  it("places every field cloud in a side lane, clear of the crane and landing column", () => {
    for (const c of cloudField()) expect(Math.abs(c.lane)).toBeGreaterThanOrEqual(0.3);
  });
  it("gives every district its own sky", () => {
    for (const d of DISTRICTS) expect(DISTRICT_SKY[d.id]).toBeDefined();
    const washes = new Set(DISTRICTS.map(d => DISTRICT_SKY[d.id].wash.join()));
    expect(washes.size).toBe(DISTRICTS.length);
  });
});

import { DISTRICT_SPIRIT, spiritMotion, spiritPresence } from "./sky";
describe("district spirits", () => {
  it("every district has an animated spirit", () => {
    expect(Object.keys(DISTRICT_SPIRIT)).toHaveLength(10);
  });
  it("spirits actually move between frames (no static art)", () => {
    for (const { kind } of Object.values(DISTRICT_SPIRIT)) {
      const a = spiritMotion(kind, 0, 1, 400, 800), b = spiritMotion(kind, 0, 1.5, 400, 800);
      expect(Math.hypot(a.x - b.x, a.y - b.y) + Math.abs(a.flap - b.flap) + Math.abs(a.rot - b.rot)).toBeGreaterThan(0.01);
    }
  });
  it("spirits are present at street level", () => {
    for (const { kind } of Object.values(DISTRICT_SPIRIT)) expect(spiritPresence(kind, 0)).toBe(1);
  });
  it("butterflies travel through the sky instead of hovering around a perch", () => {
    for (let i = 0; i < 5; i++) {
      const path = Array.from({ length: 360 }, (_, step) => spiritMotion("butterfly", i, step / 10, 390, 700));
      expect(Math.max(...path.map(p => p.y)) - Math.min(...path.map(p => p.y))).toBeGreaterThan(300);
      expect(path.every(p => p.y < 700 * 0.65)).toBe(true);
      expect(path.every(p => Math.abs(p.x - 195) >= 390 * 0.275)).toBe(true);
      expect(Math.max(...path.map(p => p.x)) - Math.min(...path.map(p => p.x))).toBeGreaterThan(40);
    }
  });
});

import { skyVisitors, visitorMotion } from "./sky";
describe("travelling painted sky visitors", () => {
  it("balloons rise and drift, and tethered kites sweep broad arcs without entering the stacking lane", () => {
    for (const kind of ["balloon", "kite"] as const) for (const v of skyVisitors(2)) {
      const path = Array.from({ length: 600 }, (_, step) => visitorMotion(kind, v, step / 10, 650, 390, 700));
      expect(Math.max(...path.map(p => p.y)) - Math.min(...path.map(p => p.y))).toBeGreaterThan(kind === "balloon" ? 500 : 220);
      expect(Math.max(...path.map(p => p.x)) - Math.min(...path.map(p => p.x))).toBeGreaterThan(50);
      expect(path.every(p => Math.abs(p.x - 195) > 100)).toBe(true);
    }
  });
  it("retains camera depth and holds visitor travel still with reduced motion", () => {
    for (const v of skyVisitors(2)) {
      const a = visitorMotion("balloon", v, 5, 500, 390, 700);
      const b = visitorMotion("balloon", v, 5, 700, 390, 700);
      expect(b.y - a.y).toBeCloseTo(200 * v.depth);
      expect(visitorMotion("kite", v, 0, 500, 390, 700, true)).toEqual(visitorMotion("kite", v, 10, 500, 390, 700, true));
    }
  });
});

import { districtSkyMix } from "./sky";
describe("district painted skies", () => {
  it("street sky at the bottom, high sky at the top, smooth blend between", () => {
    expect(districtSkyMix(0)).toEqual({ low: 1, high: 0 });
    expect(districtSkyMix(3000)).toEqual({ low: 0, high: 1 });
    const mid = districtSkyMix(1300);
    expect(mid.low).toBeGreaterThan(0.2); expect(mid.high).toBeGreaterThan(0.2);
    // gradual: a single floor (50px) never changes the mix by more than 5%
    for (let a = 0; a < 3000; a += 50) expect(districtSkyMix(a + 50).high - districtSkyMix(a).high).toBeLessThan(0.05);
  });
});

import { DISTRICT_ATMOS, cloudGlow, twinkle } from "./sky";
describe("district living sky", () => {
  it("every district has its own weather and light", () => {
    for (const a of Object.values(DISTRICT_ATMOS)) expect(a.weather.length).toBeGreaterThan(0);
    expect(DISTRICT_ATMOS.cloudpeak.weather).toContain("aurora");
  });
  it("cloud light breathes in place rather than sliding", () => {
    const a = cloudGlow(1, 0, 400, 700), b = cloudGlow(1, 6, 400, 700);
    expect(a.x).toBe(b.x); expect(a.y).toBe(b.y); expect(a.a).not.toBeCloseTo(b.a, 2);
  });
  it("stars twinkle in place", () => {
    const a = twinkle(3, 0, 400, 700), b = twinkle(3, 1.3, 400, 700);
    expect(a.x).toBe(b.x); expect(a.a).not.toBe(b.a);
  });
});

import { birdPath, birdWingPose, restingBird } from "./sky";
describe("natural bird flight", () => {
  it("does not restart a climbing wing stroke when the burst clock wraps", () => {
    expect(birdWingPose(4.799, 0, true)).toBe(2);
    expect(birdWingPose(4.801, 0, true)).toBe(2);
    expect(birdWingPose(4.9, 0, true)).toBe(3);
    expect(birdWingPose(2, 0, false)).toBe(5);
  });
  it("keeps reduced-motion birds stationary inside the sky side lanes", () => {
    for (const [w, h] of [[320, 640], [411, 792], [390, 844]] as const) for (let i = 0; i < 6; i++) {
      const m = restingBird(i, w, h);
      expect(m.x).toBeGreaterThan(28); expect(m.x).toBeLessThan(w - 28);
      expect(m.y).toBeGreaterThan(70); expect(m.y).toBeLessThan(h * 0.5);
      expect(Math.abs(m.x - w / 2)).toBeGreaterThan(w * 0.3);
      expect(m.rot).toBe(0); expect(m.pose).toBe(5);
    }
  });
  it("keeps lateral travel during the visible climb and uses wingbeats rather than an upward glide", () => {
    for (let i = 0; i < 4; i++) for (let s = 0; s < 2400; s++) {
      const a = birdPath(i, s / 20, 411, 792), b = birdPath(i, s / 20 + 0.05, 411, 792);
      if (a.x > 0 && a.x < 411 && a.y > 0 && a.y < 792 && b.y < a.y - 0.3) {
        expect(Math.abs(b.x - a.x)).toBeGreaterThan(0.01);
        expect(a.pose).toBeLessThan(5);
      }
    }
  });
  it("keeps every bird visible below the score bar for at least a third of its flight", () => {
    for (let i = 0; i < 6; i++) {
      const path = Array.from({ length: 2400 }, (_, s) => birdPath(i, s * 0.05, 390, 700));
      expect(path.filter(p => p.x > 0 && p.x < 390 && p.y > 70 && p.y < 600).length / path.length).toBeGreaterThan(0.33);
    }
  });
  it("keeps lanterns above pavement and steam in a compact rooftop band", () => {
    for (let i = 0; i < 6; i++) for (let s = 0; s < 800; s++) {
      expect(spiritMotion("lantern", i, s * 0.1, 390, 700).y).toBeLessThan(700 * 0.56);
      const steam = spiritMotion("steam", i, s * 0.1, 390, 700);
      expect(steam.y).toBeGreaterThanOrEqual(700 * 0.24);
      expect(steam.y).toBeLessThanOrEqual(700 * 0.43);
      expect(steam.scale).toBeLessThanOrEqual(1.15);
    }
  });
  it("never reverses facing in the visible sky or recycles while visible", () => {
    for (let i = 0; i < 4; i++) for (let step = 0; step < 1200; step++) {
      const a = birdPath(i, step / 20, 390, 700), b = birdPath(i, (step + 1) / 20, 390, 700);
      if (a.x > 0 && a.x < 390 && a.y > 0 && a.y < 700) {
        expect(a.mirror).toBe(b.mirror);
        expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(5);
      }
    }
  });
  it("Harbour gulls bank and alternate flapping with gliding while keeping the landing lane clear", () => {
    for (let i = 0; i < 4; i++) {
      const path = Array.from({ length: 600 }, (_, step) => spiritMotion("gull", i, step / 20, 390, 700));
      expect(path.every(p => Math.abs(p.x - 195) > 78)).toBe(true);
      expect(path.some(p => p.flap === 0)).toBe(true);
      expect(path.some(p => p.flap === 1)).toBe(true);
      expect(Math.max(...path.map(p => p.y)) - Math.min(...path.map(p => p.y))).toBeGreaterThan(60);
      expect(new Set(path.map(p => p.rot.toFixed(2))).size).toBeGreaterThan(10);
    }
  });
  it("crosses the sky sideways like a real bird: horizontal travel dominates, flapping on rises and gliding on dips", () => {
    for (let i = 0; i < 4; i++) {
      const path = Array.from({ length: 1200 }, (_, s) => birdPath(i, s / 20, 390, 700));
      expect(path.some(p => p.pose === 5)).toBe(true);
      expect(path.some(p => p.pose < 5)).toBe(true);
      expect(Math.max(...path.map(p => p.y)) - Math.min(...path.map(p => p.y))).toBeGreaterThan(60);
      expect(new Set(path.map(p => p.rot.toFixed(2))).size).toBeGreaterThan(10);
      expect(path.some(p => p.x < -20 || p.x > 410)).toBe(true); // enters and leaves off-screen
      // No elevator flight: while visible, a bird always moves sideways faster than vertically.
      for (let s = 0; s < 1199; s++) {
        const a = path[s]!, b = path[s + 1]!;
        if (a.x > 0 && a.x < 390 && Math.abs(b.x - a.x) < 3) { // same crossing, not the off-screen turn
          expect(Math.abs(b.x - a.x)).toBeGreaterThan(Math.abs(b.y - a.y));
        }
      }
    }
  });
  it("alternates crossing direction, turning around only while off-screen", () => {
    for (let i = 0; i < 4; i++) {
      const path = Array.from({ length: 2400 }, (_, s) => birdPath(i, s / 10, 390, 700));
      expect(path.some(p => p.mirror)).toBe(true);
      expect(path.some(p => !p.mirror)).toBe(true);
      // Facing matches travel direction: mirrored birds move left, unmirrored move right.
      for (let s = 0; s < 2399; s++) {
        const a = path[s]!, b = path[s + 1]!;
        if (a.x > 0 && a.x < 390 && Math.abs(b.x - a.x) < 3 && Math.abs(b.x - a.x) > 0.01) {
          expect(b.x < a.x).toBe(a.mirror);
        }
      }
    }
  });
});

import { WANDER_KINDS, districtSpirits } from "./sky";
describe("signature spirits wander naturally", () => {
  it("each signature district shows its own creature", () => {
    expect(DISTRICT_SPIRIT.riverside.kind).toBe("dragonfly");
    expect(districtSpirits("railyard").map(s => s.kind)).toEqual(["steam", "pigeon"]);
    expect(DISTRICT_SPIRIT.downtown.kind).toBe("swallow");
    expect(DISTRICT_SPIRIT.skyline.kind).toBe("firefly");
    expect(DISTRICT_SPIRIT.cloudpeak.kind).toBe("eagle");
    expect(DISTRICT_SPIRIT.university.kind).toBe("owl");
  });
  it("headings change at random: creatures face both ways and climb and dive", () => {
    for (const kind of WANDER_KINDS) for (let i = 0; i < 3; i++) {
      const path = Array.from({ length: 900 }, (_, s) => spiritMotion(kind, i, s / 15, 390, 700));
      const ys = path.map(p => p.y);
      let ups = 0, downs = 0;
      for (let s = 1; s < path.length; s++) { if (ys[s]! < ys[s - 1]! - 0.5) ups++; else if (ys[s]! > ys[s - 1]! + 0.5) downs++; }
      expect(ups).toBeGreaterThan(30); expect(downs).toBeGreaterThan(30);
      if (kind === "dragonfly" || kind === "firefly") {
        expect(path.every(p => Math.abs(p.x - 195) > 390 * 0.17)).toBe(true);
      } else {
        expect(new Set(path.map(p => p.flip)).size).toBe(2);
        expect(path.every(p => p.y < 700 * 0.48)).toBe(true);
      }
    }
  });
  it("signature creatures persist into the upper floors", () => {
    expect(spiritPresence("eagle", 6000)).toBe(1);
    expect(spiritPresence("firefly", 4000)).toBe(1);
  });
});
