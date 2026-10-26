import { describe, expect, it } from "vitest";
import { floorPosition } from "./motion";
import { TowerGeometry, retainInPlace, visibleFloorRange } from "./towerGeometry";

describe("allocation-free tower contacts", () => {
  it("matches the original rendered contacts for mixed-width tall towers", () => {
    const floors = Array.from({ length: 1000 }, (_, i) => ({ x: Math.sin(i) * 12, width: 84 - i % 5, swayAtLanding: Math.sin(i / 8) * 0.25 }));
    const cache = new TowerGeometry();
    for (const sway of [-0.3, 0, 0.18, 0.3]) {
      cache.update(floors, sway);
      let sum = 0;
      floors.forEach((f, i) => {
        const original = floorPosition(f.x, f.swayAtLanding, sway, i, f.width);
        expect(cache.xs[i]).toBeCloseTo(original, 12);
        sum += original;
      });
      expect(cache.center).toBeCloseTo(sum / floors.length, 12);
    }
  });
  it("reuses buffers and handles append, collapse and a fresh run", () => {
    const floors = [{ x: 1, width: 84, swayAtLanding: 0 }];
    const cache = new TowerGeometry().update(floors, 0.1);
    const xs = cache.xs, widths = cache.widths;
    floors.push({ x: 3, width: 72, swayAtLanding: 0.05 });
    cache.update(floors, 0.1);
    expect(cache.xs).toBe(xs);
    expect(cache.widths).toBe(widths);
    expect(cache.xs).toHaveLength(2);
    floors.splice(1);
    cache.update(floors, 0.1);
    expect(xs).toEqual([1]);
    cache.update([{ x: 9, width: 50, swayAtLanding: 0 }], 0.1);
    expect(xs).toEqual([9]);
  });
  it("visits all visible floors without scanning a thousand offscreen floors", () => {
    for (const camera of [0, 534.25, 8000, 50000]) {
      const range = visibleFloorRange(1000, camera, 50, 534, 700);
      const original = Array.from({ length: 1000 }, (_, i) => i).filter(i => {
        const y = 534 - (i * 50 + 25 - camera);
        return y > -50 && y < 750;
      });
      expect(original.every(i => i >= range.first && i < range.end)).toBe(true);
      expect(range.end - range.first).toBeLessThanOrEqual(18);
    }
  });
  it("compacts transient sprites without replacing their array", () => {
    const items = [1, 2, 3, 4, 5];
    retainInPlace(items, item => item % 2 === 1);
    expect(items).toEqual([1, 3, 5]);
    retainInPlace(items, () => false);
    expect(items).toEqual([]);
  });
});
