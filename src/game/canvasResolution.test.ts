import { describe, expect, it } from "vitest";
import { canvasResolution } from "./canvasResolution";

describe("preserved game sharpness", () => {
  it("keeps full-size resolution on repeated ad rebuilds", () => {
    for (let rebuild = 0; rebuild < 3; rebuild++) {
      expect(canvasResolution(411.5, 860.5, 2.625)).toEqual({ width: 823, height: 1721 });
    }
  });
  it("preserves lower-density phone sizing", () => {
    expect(canvasResolution(360, 700, 1.5)).toEqual({ width: 540, height: 1050 });
  });
});