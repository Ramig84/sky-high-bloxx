import { describe, expect, it } from "vitest";
import { AMBIENT, spawnAmbient, stepAmbient } from "./ambient";
import { DISTRICTS } from "./levels";

describe("district ambient life", () => {
  it("every district has its own moving layer", () => {
    for (const d of DISTRICTS) expect(AMBIENT[d.id].length).toBeGreaterThan(0);
  });
  it("falling leaves keep moving and wrap back to the top", () => {
    const [p] = spawnAmbient("university", 400, () => 0.5);
    p!.y = 670;
    stepAmbient(p!, 1, 400);
    expect(p!.y).toBe(-20);
  });
  it("boats drift sideways and stay inside the view", () => {
    const [p] = spawnAmbient("harbour", 400, () => 0.5);
    for (let i = 0; i < 2000; i++) stepAmbient(p!, 0.1, 400);
    expect(Math.abs(p!.x)).toBeLessThanOrEqual(240);
  });
});
