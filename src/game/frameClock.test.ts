import { describe, expect, it } from "vitest";
import { frameDelta, physicsSteps, MAX_FRAME_SECONDS, MAX_PHYSICS_STEP } from "./frameClock";

describe("game frame clock", () => {
  it("keeps elapsed game time when a render frame takes longer than 50ms", () => {
    expect(frameDelta(1000, 1100, false)).toBeCloseTo(0.1);
    expect(frameDelta(1000, 1400, false)).toBeCloseTo(0.4);
  });

  it("does not accumulate time while the game is paused", () => {
    expect(frameDelta(1000, 5000, true)).toBe(0);
    // The caller advances its last-frame timestamp even while paused.
    expect(frameDelta(5000, 5016, false)).toBeCloseTo(0.016);
  });

  it("ignores a backwards clock reading", () => {
    expect(frameDelta(1100, 1000, false)).toBe(0);
  });
  it("bounds suspension and invalid clock values", () => {
    expect(frameDelta(1000, 91000, false)).toBe(MAX_FRAME_SECONDS);
    expect(frameDelta(NaN, 1000, false)).toBe(0);
    expect(frameDelta(1000, Infinity, false)).toBe(0);
  });
  it("uses bounded physics steps without losing elapsed time at low FPS", () => {
    for (const dt of [1 / 120, 1 / 60, 1 / 30, 1 / 15, 0.1, 0.4, 0.5]) {
      const count = physicsSteps(dt);
      expect(dt / count).toBeLessThanOrEqual(MAX_PHYSICS_STEP + 1e-12);
      expect(count * (dt / count)).toBeCloseTo(dt, 12);
      expect(count).toBeLessThanOrEqual(30);
    }
    expect(physicsSteps(0)).toBe(0);
    expect(physicsSteps(Infinity)).toBe(0);
  });
});
