import { describe, expect, it } from "vitest";
import { coinFlightAmounts } from "./coinFlight";

describe("exact painted coin rewards", () => {
  it.each([3, 4, 5])("flies exactly %i single coins", reward => {
    expect(coinFlightAmounts(reward)).toEqual(Array(reward).fill(1));
  });
  it("large reward bundles sum to the actual reward", () => {
    expect(coinFlightAmounts(100).reduce((a, b) => a + b, 0)).toBe(100);
    expect(coinFlightAmounts(100).length).toBe(12);
  });
  it("reduced motion preserves the full reward", () => {
    expect(coinFlightAmounts(100, true)).toEqual([100]);
  });
});