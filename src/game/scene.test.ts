import { describe, expect, it } from "vitest";
import { streetSpectators } from "./scene";

describe("spectators stay on the street", () => {
  it("moves street feet with the ground as the camera rises", () => {
    const initial = streetSpectators(488, 0, 640);
    const climbed = streetSpectators(488, 100, 640);
    expect(initial.feetY).toBe(524);
    expect(climbed.feetY - initial.feetY).toBe(100);
  });
  it("leaves view when the street is below the camera", () => {
    expect(streetSpectators(488, 0, 640).visible).toBe(true);
    expect(streetSpectators(488, 200, 640).visible).toBe(false);
  });
});