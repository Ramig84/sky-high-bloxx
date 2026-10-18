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
    expect(skyProfile(1600).sunset).toBeGreaterThan(skyProfile(1599).sunset);
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
    expect(birdFlight(0.35, 0)).toBe(3);
    expect(birdFlight(2, 0)).toBe(5);
    expect(birdFlight(0, 2)).toBe(5);
    expect(birdFlight(5.6, 0)).toBe(0);
  });
});
import { DISTRICT_SKY, cloudDensity, cloudField, cloudScreenY, cloudWorldY } from "./sky";
import { DISTRICTS } from "./levels";

describe("layered sky depth", () => {
  it("never shows clouds at street level (floors 1-5)", () => {
    for (const alt of [0, 100, 250]) {
      expect(cloudDensity("wisp", alt)).toBe(0);
      expect(cloudDensity("puff", alt)).toBe(0);
    }
  });
  it("brings thin wisps first (about floor 6+) and full clouds later (about floor 16+)", () => {
    expect(cloudDensity("wisp", 650)).toBe(1);
    expect(cloudDensity("puff", 650)).toBe(0);
    expect(cloudDensity("puff", 1100)).toBe(1);
  });
  it("moves far clouds slower than near clouds as the tower climbs", () => {
    const far = cloudScreenY(1000, 1200, 0.2) - cloudScreenY(1000, 1000, 0.2);
    const near = cloudScreenY(1000, 1200, 0.9) - cloudScreenY(1000, 1000, 0.9);
    expect(near).toBeGreaterThan(far * 4);
  });
  it("keeps clouds around the camera on very tall endless towers", () => {
    const wy = cloudWorldY(500, 9000);
    expect(Math.abs(wy - 9000)).toBeLessThanOrEqual(1700);
  });
  it("places every field cloud in a side lane, clear of the crane and landing column", () => {
    for (const c of cloudField()) expect(Math.abs(c.lane)).toBeGreaterThanOrEqual(0.3);
  });
  it("gives every district its own sky", () => {
    for (const d of DISTRICTS) expect(DISTRICT_SKY[d.id]).toBeDefined();
    const washes = new Set(DISTRICTS.map(d => DISTRICT_SKY[d.id].wash.join()));
    expect(washes.size).toBe(DISTRICTS.length);
  });
});

import { DISTRICT_SPIRIT, spiritMotion, spiritPresence } from "./sky";
describe("district spirits", () => {
  it("every district has an animated spirit", () => {
    expect(Object.keys(DISTRICT_SPIRIT)).toHaveLength(10);
  });
  it("spirits actually move between frames (no static art)", () => {
    for (const { kind } of Object.values(DISTRICT_SPIRIT)) {
      const a = spiritMotion(kind, 0, 1, 400, 800), b = spiritMotion(kind, 0, 1.5, 400, 800);
      expect(Math.hypot(a.x - b.x, a.y - b.y) + Math.abs(a.flap - b.flap) + Math.abs(a.rot - b.rot)).toBeGreaterThan(0.01);
    }
  });
  it("spirits are present at street level", () => {
    for (const { kind } of Object.values(DISTRICT_SPIRIT)) expect(spiritPresence(kind, 0)).toBe(1);
  });
});
