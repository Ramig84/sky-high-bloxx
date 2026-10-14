import { describe, expect, it } from "vitest";
import { classifyLanding, collapseIndex, BLOCK_W } from "./motion";

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
    const xs = [0, 40, 80, 120];
    expect(collapseIndex(xs, BLOCK_W)).toBe(0);
    expect(collapseIndex([0, 10, -10, 5], BLOCK_W)).toBe(-1);
  });
});
