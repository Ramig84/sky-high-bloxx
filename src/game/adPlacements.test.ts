import { describe, expect, it } from "vitest";
import { extraLifeOffer, fiveLevelOffer } from "./adPlacements";
describe("final-life ad eligibility", () => {
  it("never offers after the first or second lost life", () => {
    expect(extraLifeOffer(2, false, false)).toBe(false);
    expect(extraLifeOffer(1, false, false)).toBe(false);
    expect(extraLifeOffer(3, false, false)).toBe(false);
  });
  it("offers only after the final life ends the run", () => {
    expect(extraLifeOffer(0, true, false)).toBe(true);
    expect(extraLifeOffer(0, false, false)).toBe(false);
    expect(extraLifeOffer(0, true, true)).toBe(false);
  });
});
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