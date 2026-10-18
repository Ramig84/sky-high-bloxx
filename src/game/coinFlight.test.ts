import { describe, expect, it } from "vitest";
import { coinFlightAmounts, coinFlightPoint } from "./coinFlight";

describe("exact painted coin rewards", () => {
  it("follows a continuous arc from the reward to the exact wallet position", () => {
    expect(coinFlightPoint(-180, 220, 0, 5, 0)).toEqual({ x: 0, y: 0 });
    expect(coinFlightPoint(-180, 220, 0, 5, 1)).toEqual({ x: -180, y: 220 });
    for (let step = 1; step <= 100; step++) {
      const a = coinFlightPoint(-180, 220, 0, 5, (step - 1) / 100), b = coinFlightPoint(-180, 220, 0, 5, step / 100);
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(10);
    }
  });
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