import { describe, expect, it } from "vitest";
import { blockDimensions, spaceBaseDimensions } from "./spaceBlock";
import { classifyLanding } from "./motion";

describe("Space Climb launch-gantry blocks", () => {
  it("uses a narrower single module than campaign houses", () => {
    const space = blockDimensions(true), campaign = blockDimensions(false);
    expect(space.width).toBeLessThan(campaign.width);
  });
  it("keeps campaign houses at their approved dimensions", () => {
    expect(blockDimensions(false)).toEqual({ width: 84, height: 50 });
  });
  it("enlarges Space Climb modules while retaining a compact section", () => {
    expect(blockDimensions(true)).toEqual({ width: 72, height: 52 });
  });
  it("matches the launch support contact beam to the fixed footing", () => {
    expect(spaceBaseDimensions(72).width * 0.54).toBeCloseTo(72 * 1.12);
  });
  it("retains the four-percent perfect window on the smaller module", () => {
    const { width } = blockDimensions(true);
    expect(classifyLanding(width * 0.04, width)).toBe("perfect");
    expect(classifyLanding(width * 0.041, width)).toBe("ok");
  });
});