import { describe, expect, it } from "vitest";
import { collapseIndex, towerBalance } from "./motion";

describe("contact-based balance warning", () => {
  it("centered stacks are stable even when tall", () => {
    expect(towerBalance(Array(140).fill(0), 84)).toEqual({ risk: 0, direction: 0, state: "stable" });
  });
  it("warns before an overhanging stack fails", () => {
    expect(collapseIndex([0, 30, 42], 84)).toBe(-1);
    expect(towerBalance([0, 30, 42], 84).state).toBe("warning");
  });
  it("identifies the direction of near-collapse without weakening balance", () => {
    expect(towerBalance([0, 30, 50], 84).state).toBe("danger");
    expect(towerBalance([0, -30, -50], 84).direction).toBe(-1);
    expect(collapseIndex([0, 40, 60], 84)).not.toBe(-1);
  });
});