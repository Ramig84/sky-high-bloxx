import { describe, expect, it } from "vitest";
import { cloudDensity, districtSpirits, mistBand, signatureBirdMotion, spiritPresence, windCue, windCuePose } from "./sky";
import { DISTRICTS, districtGoal } from "./levels";
import { BLOCK_H } from "./motion";

describe("approved wind cue reads existing wind only", () => {
  it("cycles six authored poses in 1.8 seconds and holds one pose under reduced motion", () => {
    expect([0, 0.31, 0.61, 0.91, 1.21, 1.51].map(t => windCuePose(t, false))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(windCuePose(1.81, false)).toBe(0);
    expect(windCuePose(1.51, true)).toBe(0);
  });
  it("is absent in calm levels", () => {
    expect(windCue(0, 1, true, false, false).visible).toBe(false);
  });
  it("shows the actual direction before release and during descent", () => {
    expect(windCue(100, -1, true, false, false)).toEqual({ visible: true, direction: -1 });
    expect(windCue(100, 1, false, true, false)).toEqual({ visible: true, direction: 1 });
  });
  it("is absent after the run and between floors", () => {
    expect(windCue(100, 1, true, false, true).visible).toBe(false);
    expect(windCue(100, 1, false, false, false).visible).toBe(false);
  });
});

describe("bounded scenery depth", () => {
  it("low mist follows camera depth and disappears rather than replenishing from the pavement", () => {
    for (let i = 0; i < 3; i++) {
      const ground = mistBand(i, 0, 390, 700), elevated = mistBand(i, 200, 390, 700);
      expect(ground.y).toBeLessThan(534);
      expect(elevated.y - ground.y).toBeCloseTo(130);
      expect(mistBand(i, 850, 390, 700).alpha).toBe(0);
    }
  });
  it("full clouds arrive later than wisps even for long climbs", () => {
    expect(cloudDensity("wisp", 250, 7000)).toBe(0);
    expect(cloudDensity("puff", 650, 7000)).toBe(0);
    expect(cloudDensity("puff", 1100, 7000)).toBe(1);
    expect(cloudDensity("wisp", 6000, 7000)).toBeCloseTo(0.12);
    expect(cloudDensity("wisp", 7800, 7000)).toBe(0);
  });
  it("retains sparse appropriate creatures through final district goals but never roof steam or street leaves", () => {
    for (const [index, d] of DISTRICTS.entries()) {
      const top = (districtGoal(index, 9) - 1.2) * BLOCK_H;
      for (const { kind } of districtSpirits(d.id)) {
        if (kind === "steam" || kind === "leaf" || kind === "lantern") continue;
        expect(spiritPresence(kind, top, top)).toBeGreaterThanOrEqual(0.2);
      }
    }
    expect(spiritPresence("steam", 6000, 7000)).toBe(0);
    expect(spiritPresence("leaf", 6000, 7000)).toBe(0);
    expect(spiritPresence("lantern", 6000, 7000)).toBe(0);
  });
});

describe("signature birds sweep naturally without visible reversals", () => {
  for (const kind of ["swallow", "pigeon", "owl", "eagle"] as const) {
    it(`${kind} maintains forward travel, shallow banks and turns only outside the view`, () => {
      for (const width of [280, 390, 600]) for (let i = 0; i < 3; i++) {
        let visibleSamples = 0;
        const directions = new Set<number>();
        for (let step = 0; step < 4000; step++) {
          const a = signatureBirdMotion(kind, i, step / 20, width, 700);
          const b = signatureBirdMotion(kind, i, (step + 1) / 20, width, 700);
          directions.add(a.flip);
          if (a.x >= 0 && a.x <= width) {
            visibleSamples++;
            expect(b.flip).toBe(a.flip);
            expect(Math.abs(b.x - a.x)).toBeGreaterThan(Math.abs(b.y - a.y));
            expect(b.x > a.x).toBe(a.flip > 0);
            expect(Math.abs(b.rot - a.rot)).toBeLessThan(0.03);
          }
        }
        expect(visibleSamples).toBeGreaterThan(800);
        expect(directions.size).toBe(2);
      }
    });
  }
});