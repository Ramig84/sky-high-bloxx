import { describe, expect, it } from "vitest";
import { cascadeDepth, windowGlow, LIGHT_REST } from "./impact";
import { duckProfile, landingPitch } from "./audioMix";

describe("perfect window lights", () => {
  it("flicker on, peak, then stay lit at the resting glow", () => {
    expect(windowGlow(0.08)).toBeLessThan(windowGlow(0.03));
    expect(windowGlow(0.35)).toBeCloseTo(1, 5);
    expect(windowGlow(5)).toBe(LIGHT_REST);
    expect(windowGlow(-0.1)).toBe(0);
  });
  it("light more floors as the combo climbs, capped at six", () => {
    expect(cascadeDepth(1)).toBe(1);
    expect(cascadeDepth(4)).toBe(4);
    expect(cascadeDepth(20)).toBe(6);
  });
});

describe("impact audio", () => {
  it("landings are deep low down and crisper high up", () => {
    expect(landingPitch(0)).toBeCloseTo(0.86, 5);
    expect(landingPitch(40)).toBeCloseTo(1.08, 5);
    expect(landingPitch(200)).toBeCloseTo(1.08, 5);
  });
  it("heavier events duck music deeper and longer", () => {
    expect(duckProfile("perfect").depth).toBeGreaterThan(duckProfile("land").depth);
    expect(duckProfile("collapse").release).toBeGreaterThan(duckProfile("perfect").release);
  });
});
