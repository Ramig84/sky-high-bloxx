import { describe, expect, it } from "vitest";
import { spectatorPose } from "./reactions";

describe("two spectators react to gameplay", () => {
  it("changes relaxed poses while waiting", () => {
    expect(spectatorPose("idle", 0)).toBe(0);
    expect(spectatorPose("idle", 1.5)).toBe(1);
  });
  it("cycles happy poses after a safe landing", () => {
    expect(spectatorPose("happy", 0)).toBe(2);
    expect(spectatorPose("happy", 0.3)).toBe(3);
  });
  it("cycles disappointed poses after a miss", () => {
    expect(spectatorPose("sad", 0)).toBe(4);
    expect(spectatorPose("sad", 0.8)).toBe(5);
  });
});