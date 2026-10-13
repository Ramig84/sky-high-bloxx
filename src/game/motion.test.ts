import { describe, expect, it } from "vitest";
import { advanceSwing, suspendedBlock, HOOK_HEIGHT, ROPE_LENGTH, integrateFall, floorSway } from "./motion";

describe("continuous game motion", () => {
  it("keeps the swing continuous when another floor lands", () => {
    const phase = 42;
    expect(advanceSwing(phase, 15, 0)).toBe(phase);
    expect(advanceSwing(phase, 15, 1 / 60) - phase).toBeCloseTo(2.35 / 60);
  });
  it("keeps the lifting bracket attached to the rope while rotated", () => {
    for (const theta of [-0.85, 0, 0.85]) {
      const block = suspendedBlock(theta, 10);
      expect(block.x - Math.sin(theta) * HOOK_HEIGHT).toBeCloseTo(Math.sin(theta) * ROPE_LENGTH);
      expect(block.y + Math.cos(theta) * HOOK_HEIGHT).toBeCloseTo(10 - Math.cos(theta) * ROPE_LENGTH);
    }
  });
  it("falls the same distance at 30 and 120 frames per second", () => {
    const simulate = (fps: number) => {
      const f = { x: 0, y: 20, vx: 3, vy: 0 };
      for (let i = 0; i < fps; i++) integrateFall(f, 1 / fps, 26);
      return f;
    };
    expect(simulate(30).y).toBeCloseTo(7);
    expect(simulate(120).y).toBeCloseTo(simulate(30).y);
    expect(simulate(120).x).toBeCloseTo(3);
  });
  it("keeps the base fixed and produces finite floor motion", () => {
    expect(floorSway(1, -1)).toBe(0);
    expect(Number.isFinite(floorSway(1, 1000))).toBe(true);
  });
});