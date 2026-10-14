import { describe, expect, it } from "vitest";
import { advanceSwing, suspendedBlock, HOOK_HEIGHT, ROPE_LENGTH, integrateFall, floorSway, advanceToLanding, targetTowerSway, floorPosition, collapseIndex, floorDifficulty } from "./motion";

describe("continuous game motion", () => {
  it("slightly slows floor speed growth while keeping it increasing", () => {
    expect(floorDifficulty(10, 0)).toBe(4.5);
    expect(floorDifficulty(20, 0)).toBeGreaterThan(floorDifficulty(10, 0));
  });
  it("keeps a straight 140-floor tower stable throughout its sway cycle", () => {
    for (let t = 0; t < 12; t += 0.1) {
      const sway = targetTowerSway(0, 140, t);
      const xs = Array.from({ length: 140 }, (_, i) => floorPosition(0, 0, sway, i, 84));
      expect(collapseIndex(xs, 84)).toBe(-1);
      expect(Math.abs(xs[139] ?? 0)).toBeLessThan(7);
    }
  });
  it("bounds extreme lean instead of amplifying it", () => {
    expect(Math.abs(targetTowerSway(100, 140, 1))).toBeLessThanOrEqual(0.4);
    expect(Math.abs(targetTowerSway(-100, 140, 1))).toBeLessThanOrEqual(0.4);
  });
  it("judges horizontal contact at the same position across frame rates", () => {
    const contactX = (fps: number) => {
      const block = { x: 0, y: 200, vx: 40, vy: 0 };
      for (let i = 0; i < fps * 2; i++) {
        if (advanceToLanding(block, 1 / fps, 1500, 50, 25)) return block.x;
      }
      throw new Error("No landing");
    };
    expect(contactX(20)).toBeCloseTo(40 * Math.sqrt(250 / 1500));
    expect(contactX(120)).toBeCloseTo(contactX(20));
  });
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