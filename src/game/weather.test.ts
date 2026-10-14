import { describe, it, expect } from "vitest";
import { spawnRain, stepRain } from "./weather";
describe("continuous painted rain", () => {
  it("moves with the wind without changing vertical fall", () => {
    const p = spawnRain(360, 640, () => 0.5)[0];
    if (!p) throw new Error("Missing stroke");
    const q = { ...p };
    stepRain(p, 1, 360, 640, 100); stepRain(q, 1, 360, 640, -100);
    expect(p.x - q.x).toBeCloseTo(24); expect(p.y).toBe(q.y);
  });
  it("is frame-rate independent through wrapping", () => {
    const simulate = (fps: number) => {
      const p = spawnRain(360, 640, () => 0.5)[0];
      if (!p) throw new Error("Missing stroke");
      for (let i = 0; i < fps * 5; i++) stepRain(p, 1 / fps, 360, 640, 100);
      return p;
    };
    expect(simulate(30).y).toBeCloseTo(simulate(120).y);
    expect(simulate(30).x).toBeCloseTo(simulate(120).x);
  });
});