import { describe, expect, it } from "vitest";
import { SPACE_EFFECTS, SPACE_WARNING_SECONDS, freshSpaceHazards, resetSpaceHazardLane, stepSpaceHazards, spaceEffectLayers, spaceEffectMotion, spaceHazardConfig, spaceHazardHits, spaceHazardPosition, type SpaceHazard } from "./spaceEffects";

describe("Space Climb living scenes", () => {
  it("gives all eleven zones their own effect vocabulary", () => {
    expect(SPACE_EFFECTS).toHaveLength(11);
    for (const effects of SPACE_EFFECTS) expect(effects.length).toBeGreaterThan(0);
    expect(SPACE_EFFECTS[5]?.map(e => e.kind)).toContain("lunarDust");
    expect(SPACE_EFFECTS[6]?.map(e => e.kind)).toContain("marsDust");
    expect(SPACE_EFFECTS[8]?.map(e => e.kind)).toContain("stormBand");
    expect(SPACE_EFFECTS[9]?.map(e => e.kind)).toContain("ringIce");
    expect(SPACE_EFFECTS[10]?.map(e => e.kind)).toContain("comet");
  });
  it("does not send Earth wildlife or weather into space", () => {
    for (const effects of SPACE_EFFECTS.slice(4)) for (const e of effects) expect(["bird", "cloud", "lightning", "aurora"]).not.toContain(e.kind);
  });
  it("dissolves effects with the skies and keeps total opacity stable", () => {
    const layers = spaceEffectLayers(149);
    expect(layers[1]?.zone).toBe(5);
    expect(layers[1]?.alpha).toBeGreaterThan(0.99);
    for (let f = 0; f <= 620; f++) expect(spaceEffectLayers(f).reduce((s, l) => s + l.alpha, 0)).toBeCloseTo(1);
  });
  it("keeps near decorative rocks out of the stacking lane at phone and tablet widths", () => {
    for (const width of [280, 360, 500]) for (const kind of ["debris", "asteroid", "ringIce"] as const) for (let t = 0; t < 80; t++) for (let i = 0; i < 4; i++) {
      const m = spaceEffectMotion(kind, i, t, width, 700);
      expect(Math.abs(m.x - width / 2)).toBeGreaterThan(width * 0.3);
    }
  });
  it("stops decorative motion under reduced motion", () => {
    expect(spaceEffectMotion("debris", 1, 40, 360, 700, true)).toEqual(spaceEffectMotion("debris", 1, 0, 360, 700, true));
    expect(spaceEffectMotion("lightning", 0, 0.6, 360, 700, true).alpha).toBe(0);
    expect(spaceEffectMotion("comet", 0, 40, 360, 700, true)).toEqual(spaceEffectMotion("comet", 0, 0, 360, 700, true));
  });
});

describe("warned space obstacles", () => {
  const hazard: SpaceHazard = { kind: "debris", started: 10, direction: 1, y: 400, duration: 5, size: 30 };
  it("keeps all Earth and Edge of Space floors free of debris obstacles", () => {
    for (let f = 0; f < 100; f++) expect(spaceHazardConfig(f)).toBeNull();
    expect(spaceHazardConfig(100)?.kind).toBe("debris");
  });
  it("warns for 2.4 seconds before a crossing can hit", () => {
    expect(SPACE_WARNING_SECONDS).toBe(2.4);
    expect(spaceHazardPosition(hazard, 12.39, 360)).toMatchObject({ warning: true, active: false });
    expect(spaceHazardPosition(hazard, 12.41, 360)).toMatchObject({ warning: false, active: true });
  });
  it("uses the proper solid material for later zones", () => {
    expect(spaceHazardConfig(260)?.kind).toBe("asteroid");
    expect(spaceHazardConfig(410)?.kind).toBe("ringIce");
    expect(spaceHazardConfig(500)?.kind).toBe("comet");
  });
  it("holds position while the simulation clock is paused and finishes offscreen", () => {
    const scheduled = stepSpaceHazards(freshSpaceHazards(), 100, 0, 400);
    expect(stepSpaceHazards(scheduled, 100, 17.9, 400).hazard).toBeNull();
    const active = stepSpaceHazards(scheduled, 100, 18, 400);
    expect(active.hazard?.started).toBe(18);
    expect(stepSpaceHazards(active, 100, 18, 400)).toBe(active);
    expect(spaceHazardPosition(hazard, 18, 360)).toMatchObject({ active: false, done: true });
    expect(spaceHazardPosition(hazard, 18, 360).x).toBeGreaterThan(180);
  });
  it("clears the old lane on landing and starts a new run without a queued crossing", () => {
    const active = stepSpaceHazards({ next: 18, sequence: 0, hazard: null }, 100, 18, 400);
    expect(resetSpaceHazardLane(active, 101, 20)).toMatchObject({ hazard: null, next: 38 });
    expect(freshSpaceHazards()).toEqual({ next: null, sequence: 0, hazard: null });
    expect(stepSpaceHazards(active, 50, 20, 400).hazard).toBeNull();
    expect(resetSpaceHazardLane({ next: 18, sequence: 0, hazard: null }, 101, 5).next).toBe(18);
  });
  it("crosses from the warned side in both directions", () => {
    const right = spaceHazardPosition(hazard, 12.41, 360);
    const left = spaceHazardPosition({ ...hazard, direction: -1 }, 12.41, 360);
    expect(right.x).toBeLessThan(-180);
    expect(left.x).toBeGreaterThan(180);
    expect(left.x).toBeCloseTo(-right.x);
  });
  it("catches a fast crossing between frames", () => {
    expect(spaceHazardHits({ x: -100, y: 400 }, { x: 100, y: 400 }, { x: 0, y: 400 }, { x: 0, y: 390 }, 40, 20, 8)).toBe(true);
  });
  it("does not hit a block in a different lane or height", () => {
    expect(spaceHazardHits({ x: -100, y: 400 }, { x: 100, y: 400 }, { x: 0, y: 600 }, { x: 0, y: 590 }, 40, 20, 8)).toBe(false);
    expect(spaceHazardHits({ x: -100, y: 400 }, { x: -90, y: 400 }, { x: 70, y: 400 }, { x: 70, y: 390 }, 40, 20, 8)).toBe(false);
  });
});