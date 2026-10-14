import { describe, expect, it } from "vitest";
import { AMBIENT, backdropPoint, spawnAmbient, stepAmbient } from "./ambient";
import { DISTRICTS } from "./levels";

describe("district ambient life", () => {
  it("every district has its own moving layer", () => {
    for (const d of DISTRICTS) expect(AMBIENT[d.id].length).toBeGreaterThan(0);
  });
  it("falling leaves keep moving and wrap back to the top", () => {
    const [p] = spawnAmbient("university", 400, () => 0.5);
    if (!p) throw new Error("Missing leaf");
    p.y = 670;
    stepAmbient(p, 1, 400);
    expect(p.y).toBe(-20);
  });
  it("boats drift sideways and stay inside the view", () => {
    const [p] = spawnAmbient("harbour", 400, () => 0.5);
    if (!p) throw new Error("Missing boat");
    for (let i = 0; i < 2000; i++) stepAmbient(p, 0.1, 400);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(240);
  });
  it("does not spawn boats in Riverside's tree-covered foreground", () => {
    expect(spawnAmbient("riverside", 360).some(p => p.layer.kind === "boat")).toBe(false);
  });
  it("anchors harbour boats to painted water at every camera height", () => {
    const first = backdropPoint(864, 1536, 360, 640, 0.5, 0.704, 0);
    const high = backdropPoint(864, 1536, 360, 640, 0.5, 0.704, 200);
    expect(first.x).toBe(180);
    expect(first.y).toBeCloseTo(450.56);
    expect(high.y - first.y).toBe(200);
  });
});
