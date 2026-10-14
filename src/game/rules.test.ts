import { describe, expect, it } from "vitest";
import { classifyLanding, collapseIndex, floorPosition, floorSway, landingReward, BLOCK_W } from "./motion";

describe("2D stacking rules", () => {
  it("perfect only within ±4% of block width", () => {
    expect(classifyLanding(BLOCK_W * 0.04, BLOCK_W)).toBe("perfect");
    expect(classifyLanding(BLOCK_W * 0.05, BLOCK_W)).toBe("ok");
  });
  it("block falls off past half-block overhang", () => {
    expect(classifyLanding(BLOCK_W * 0.49, BLOCK_W)).toBe("ok");
    expect(classifyLanding(BLOCK_W * 0.51, BLOCK_W)).toBe("miss");
  });
  it("first floor must land near the plot centre", () => {
    expect(classifyLanding(BLOCK_W * 0.47, BLOCK_W, true)).toBe("miss");
  });
  it("side-stacking staircase collapses", () => {
    const xs = [0, 25, 50, 75];
    expect(collapseIndex(xs, BLOCK_W)).toBe(0);
    expect(collapseIndex([0, 10, -10, 5], BLOCK_W)).toBe(-1);
  });
  it("checks the actual overlap rather than the entire lower floor", () => {
    expect(collapseIndex([0, 40, -10, -10], 84)).toBe(1);
  });
  it("checks total tower weight against the fixed foundation", () => {
    expect(collapseIndex([37, 60, 60], 84)).toBe(-2);
    expect(collapseIndex([37, 37, 37], 84)).toBe(-1);
  });
  it("handles mirrored overhangs equally", () => {
    expect(collapseIndex([0, -25, -50, -75], 84)).toBe(0);
  });
  it("keeps balanced counterweights stable", () => {
    expect(collapseIndex([0, 30, 0, 0], 84)).toBe(-1);
  });
  it("does not move a perfect landing when placed in a swaying tower", () => {
    const support = 12;
    expect(floorPosition(support, 0.5, 0.5, 8, 84)).toBe(support);
    expect(floorPosition(support, -0.5, -0.5, 8, 84)).toBe(support);
  });
  it("keeps the actual ground floor anchored", () => {
    expect(floorSway(1, 0)).toBe(0);
    expect(floorPosition(20, 0, 1, 0, 84)).toBe(20);
  });
  it("awards 25 per perfect multiplier, capped at ten", () => {
    expect(landingReward("perfect", 0)).toEqual({ combo: 1, points: 25 });
    expect(landingReward("perfect", 9)).toEqual({ combo: 10, points: 250 });
    expect(landingReward("perfect", 10)).toEqual({ combo: 11, points: 250 });
  });
  it("resets the combo on ordinary and missed drops", () => {
    expect(landingReward("ok", 4)).toEqual({ combo: 0, points: 10 });
    expect(landingReward("miss", 4)).toEqual({ combo: 0, points: 0 });
  });
});
