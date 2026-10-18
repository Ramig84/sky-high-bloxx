import { describe, expect, it } from "vitest";
import { spiritArtwork, spiritPose, type PaintedSpirit } from "./spiritArtwork";
import { DISTRICT_SPIRIT } from "./sky";

describe("painted spirit pose timing", () => {
  it("animates every district's creature through changing whole painted poses", () => {
    for (const { kind } of Object.values(DISTRICT_SPIRIT)) {
      const poses = new Set(Array.from({ length: 80 }, (_, i) => spiritPose(kind, 0, i / 30)));
      expect(poses.size).toBeGreaterThanOrEqual(4);
      expect([...poses].every(p => Number.isInteger(p) && p >= 0 && p < 8)).toBe(true);
    }
  });
  it("also changes street decorations and airborne visitors, rather than holding one icon", () => {
    for (const kind of ["boat", "petal", "kite", "balloon"] as const) {
      expect(new Set(Array.from({ length: 100 }, (_, i) => spiritPose(kind, 0, i / 20))).size).toBe(8);
    }
  });
  it("keeps independent pose phases and deterministic replay timing", () => {
    for (const kind of Object.keys(spiritArtwork) as PaintedSpirit[]) {
      expect(spiritPose(kind, 0, 0)).not.toBe(spiritPose(kind, 1, 0));
      expect(spiritPose(kind, 3, 12.3)).toBe(spiritPose(kind, 3, 12.3));
    }
  });
});