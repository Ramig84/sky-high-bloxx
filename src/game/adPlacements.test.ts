import { describe, expect, it } from "vitest";
import { fiveLevelOffer } from "./adPlacements";
describe("five-level rewarded ad position", () => {
  it("offers after campaign levels 5 and 10, not 4 or 6", () => {
    expect(fiveLevelOffer(4, true, false, false)).toBe(true);
    expect(fiveLevelOffer(9, true, false, false)).toBe(true);
    expect(fiveLevelOffer(3, true, false, false)).toBe(false);
    expect(fiveLevelOffer(5, true, false, false)).toBe(false);
  });
  it("does not offer on failed runs, daily challenge or Endless", () => {
    expect(fiveLevelOffer(4, false, false, false)).toBe(false);
    expect(fiveLevelOffer(4, true, true, false)).toBe(false);
    expect(fiveLevelOffer(4, true, false, true)).toBe(false);
  });
});