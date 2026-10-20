import { describe, expect, it } from "vitest";
import { summariseFrames } from "./adDebug";

describe("ad debug frame stats", () => {
  it("reports 60 fps for steady 16.67ms frames", () => {
    expect(summariseFrames(Array(60).fill(1000 / 60), [4, 6]).fps).toBe(60);
  });
  it("separates slow drawing from slow screen updates", () => {
    const s = summariseFrames([100, 150, 120], [3, 3, 3]);
    expect(s.fps).toBe(8);
    expect(s.drawMs).toBe(3);
    expect(s.worstMs).toBe(150);
  });
});
