import { describe, expect, it } from "vitest";
import { ZONES, isComplete, isUnlocked, recordFloors } from "./zones";

describe("city map zones", () => {
  it("has goals of 10, 15 and 20 floors", () => {
    expect(ZONES.map(z => z.goal)).toEqual([10, 15, 20]);
  });
  it("only Old Town is open at the start", () => {
    expect([0, 1, 2].map(i => isUnlocked({}, i))).toEqual([true, false, false]);
  });
  it("Harbour opens after 10 Old Town floors in one run, not 9", () => {
    expect(isUnlocked({ oldtown: 9 }, 1)).toBe(false);
    expect(isUnlocked({ oldtown: 10 }, 1)).toBe(true);
    expect(isUnlocked({ oldtown: 10 }, 2)).toBe(false);
  });
  it("Downtown opens after 15 Harbour floors", () => {
    expect(isUnlocked({ oldtown: 10, harbour: 15 }, 2)).toBe(true);
  });
  it("keeps the best floor count per zone", () => {
    const p = recordFloors(recordFloors({}, "harbour", 12), "harbour", 7);
    expect(p.harbour).toBe(12);
    expect(isComplete(recordFloors(p, "harbour", 15), "harbour")).toBe(true);
  });
});
