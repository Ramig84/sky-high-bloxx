import { describe, expect, it } from "vitest";
import { birdFlight, cloudHeight, skyBlend, skyProfile } from "./sky";

describe("presentation-only altitude journey", () => {
  it("retains the existing street, sunset and stratosphere altitude boundaries", () => {
    expect(skyProfile(400).street).toBe(1);
    expect(skyProfile(900).street).toBe(0);
    expect(skyProfile(1200).sunset).toBe(0);
    expect(skyProfile(2000).sunset).toBe(1);
    expect(skyProfile(3000).space).toBe(0);
    expect(skyProfile(3800).space).toBe(1);
  });
  it("leaves terrestrial life below the upper sky", () => {
    expect(skyProfile(500).districtLife).toBe(1);
    expect(skyProfile(1100).districtLife).toBe(0);
    expect(skyProfile(2200).birds).toBe(0);
    expect(skyProfile(3800).clouds).toBe(0);
  });
  it("eases continuously into both ends and preserves the midpoint", () => {
    expect(skyBlend(1600, 1200, 2000)).toBe(0.5);
    expect(skyBlend(1201, 1200, 2000)).toBeLessThan(0.00001);
    expect(1 - skyBlend(1999, 1200, 2000)).toBeLessThan(0.00001);
    expect(skyProfile(1600)).toEqual(skyProfile(1600));
  });
  it("replenishes painted clouds throughout ascent and descent, outside the viewport", () => {
    for (const altitude of [0, 800, 1600, 2400, 3200, 2400, 800, 0]) {
      const positions = [0, 1, 2, 3, 4].map(i => cloudHeight(260 + i * 212, altitude, 0.42, 700));
      expect(positions.filter(y => y >= 0 && y <= 700).length).toBeGreaterThanOrEqual(3);
      expect(positions.every(y => y >= -180 && y < 880)).toBe(true);
    }
    expect(cloudHeight(260, 0, 0.42, 700)).toBe(cloudHeight(260, 1060 / 0.42, 0.42, 700));
  });
  it("uses changing painted wing poses then a glide with independent phases", () => {
    expect(birdFlight(0, 0)).toBe(0);
    expect(birdFlight(0.3, 0)).toBe(3);
    expect(birdFlight(2, 0)).toBe(5);
    expect(birdFlight(0, 2)).toBe(5);
    expect(birdFlight(5.6, 0)).toBe(0);
  });
});