import { describe, expect, it } from "vitest";
import { advanceKick, dustAlpha, dustPose, freshKick, hapticPattern, landingKick, settleSquash, DUST_LIFE } from "./impact";

describe("landing impact", () => {
  it("plays all eight dust poses in order then ends", () => {
    const seen = new Set<number>();
    for (let t = 0; t < DUST_LIFE; t += 0.01) seen.add(dustPose(t));
    expect([...seen]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(dustPose(DUST_LIFE)).toBe(-1);
    expect(dustAlpha(0.1)).toBe(1);
  });
  it("centred drop kicks straight down, off-centre jolts sideways", () => {
    expect(landingKick(freshKick(), 0, true).vx).toBe(0);
    expect(landingKick(freshKick(), -0.5, false).vx).toBeLessThan(0);
  });
  it("camera spring returns to rest within a second at any frame rate", () => {
    for (const dt of [1 / 120, 1 / 30]) {
      let k = landingKick(freshKick(), 0.8, false);
      for (let t = 0; t < 1; t += dt) k = advanceKick(k, dt);
      expect(Math.abs(k.x) + Math.abs(k.y)).toBeLessThan(0.05);
    }
  });
  it("settle squash is brief and small", () => {
    expect(settleSquash(0.08)).toBeCloseTo(0.035, 3);
    expect(settleSquash(0.2)).toBe(0);
  });
  it("perfect haptic tightens with combo", () => {
    expect(hapticPattern("perfect", 0)[1]).toBe(60);
    expect(hapticPattern("perfect", 7)[1]).toBe(25);
  });
});
