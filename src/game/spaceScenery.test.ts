import { describe, expect, it } from "vitest";
import { SPACE_ZONES } from "./spaceClimb";
import { spaceSceneryPoint, spaceSceneryTransform } from "./spaceScenery";

describe("ascending painted scenery", () => {
  it("moves downward in every zone as the tower camera rises", () => {
    for (const [i, zone] of SPACE_ZONES.entries()) {
      const end = SPACE_ZONES[i + 1]?.start ?? 600;
      const a = spaceSceneryTransform(i, zone.start, 411, 792);
      const b = spaceSceneryTransform(i, end, 411, 792);
      expect(b.y).toBeGreaterThan(a.y);
      expect(b.y).toBeCloseTo(0);
    }
  });
  it("never exposes a sky edge on phone and tablet crops or after a collapse", () => {
    for (const [w,h] of [[320,740],[411,792],[430,932],[768,1024]]) {
      for (let f = 0; f <= 650; f += 3) for (let z = 0; z < 11; z++) {
        const a = spaceSceneryTransform(z,f,w ?? 411,h ?? 792);
        expect(a.y).toBeLessThanOrEqual(0);
        expect(a.y + a.height).toBeGreaterThanOrEqual(h ?? 792);
        expect(a.x).toBeLessThanOrEqual(0);
        expect(a.x + a.width).toBeGreaterThanOrEqual(w ?? 411);
      }
    }
  });
  it("keeps planet material attached to identical painted coordinates during camera travel", () => {
    const a = spaceSceneryTransform(8,350,411,792);
    const b = spaceSceneryTransform(8,380,411,792);
    const pa = spaceSceneryPoint(8,350,411,792,0.74,0.87);
    const pb = spaceSceneryPoint(8,380,411,792,0.74,0.87);
    expect(pb.y-pa.y).toBeCloseTo(b.y-a.y);
    expect(pb.x).toBe(pa.x);
    expect(spaceSceneryTransform(8,350,411,792)).toEqual(a);
  });
});