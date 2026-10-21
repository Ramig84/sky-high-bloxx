import { describe, expect, it } from "vitest";
import { SPACE_ZONES, floorsToNextZone, spaceSpec, zoneAt } from "./spaceClimb";
import { levelSpec } from "./levels";

describe("Space Climb zones", () => {
  it("has 11 zones and reaches space (Edge of Space) at floor 75", () => {
    expect(SPACE_ZONES).toHaveLength(11);
    expect(SPACE_ZONES[zoneAt(74)]!.id).toBe("storm");
    expect(SPACE_ZONES[zoneAt(75)]!.id).toBe("edge");
    expect(SPACE_ZONES[zoneAt(150)]!.id).toBe("moon");
    expect(SPACE_ZONES[zoneAt(500)]!.id).toBe("deep");
    expect(SPACE_ZONES[zoneAt(5000)]!.id).toBe("deep");
  });
  it("counts floors to the next zone", () => {
    expect(floorsToNextZone(20)).toBe(5);
    expect(floorsToNextZone(520)).toBeNull();
  });
  it("starts harder than the campaign finale and steps up at every zone", () => {
    expect(spaceSpec(0).speed).toBeGreaterThan(levelSpec(99).speed);
    for (const z of SPACE_ZONES.slice(1)) expect(spaceSpec(z.start).speed).toBeGreaterThan(spaceSpec(z.start - 1).speed);
  });
  it("adds obstacles by zone and keeps earlier ones", () => {
    expect(spaceSpec(24).wind).toBe(0);
    expect(spaceSpec(25).wind).toBeGreaterThan(0);
    expect(spaceSpec(50).slip).toBeGreaterThan(0);
    expect(spaceSpec(75).slide).toBeGreaterThan(0);
    expect(spaceSpec(160).gravity).toBe(0.7);
    expect(spaceSpec(210).gravity).toBe(1);
    expect(spaceSpec(210).wind).toBeGreaterThan(spaceSpec(190).wind);
    expect(spaceSpec(270).width).toBeLessThan(1);
    expect(spaceSpec(340).pull).toBeGreaterThan(0);
    expect(spaceSpec(420).arc).toBeGreaterThan(0);
    const deep = spaceSpec(550);
    expect(deep.wind && deep.slip && deep.slide && deep.pull && deep.arc).toBeTruthy();
    expect(deep.width).toBeLessThan(1);
  });
  it("never ends by goal and caps speed after 600", () => {
    expect(spaceSpec(900).goal).toBe(Infinity);
    expect(spaceSpec(900).speed).toBe(spaceSpec(600).speed);
  });
});
