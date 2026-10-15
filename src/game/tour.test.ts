import { describe, expect, it } from "vitest";
import { isPreview, tomorrowDistrict, tourDistrict, tourLevel } from "./tour";

describe("district tour", () => {
  it("is the same district all day for everyone", () => {
    expect(tourDistrict(new Date("2026-10-15T00:01:00Z"))).toBe(tourDistrict(new Date("2026-10-15T23:59:00Z")));
  });
  it("visits all 10 districts in 10 days", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 10; i++) seen.add(tourDistrict(new Date(Date.UTC(2026, 9, 15 + i))));
    expect(seen.size).toBe(10);
  });
  it("matches the server formula for a known day", () => {
    // 2026-10-15 is epoch day 20741 -> 20741*3 % 10 = 3
    expect(tourDistrict(new Date("2026-10-15T08:00:00Z"))).toBe(3);
  });
  it("tomorrow is the next day's district", () => {
    expect(tomorrowDistrict(new Date("2026-10-15T08:00:00Z"))).toBe(tourDistrict(new Date("2026-10-16T08:00:00Z")));
  });
  it("beginners get the first level of the district, veterans the last", () => {
    const now = new Date("2026-10-15T08:00:00Z");
    expect(tourLevel(now, [])).toBe(30);
    expect(tourLevel(now, Array(25).fill(1))).toBe(32);
    expect(tourLevel(now, Array(100).fill(3))).toBe(39);
  });
  it("marks locked districts as previews", () => {
    expect(isPreview(3, [])).toBe(true);
    expect(isPreview(0, [])).toBe(false);
  });
});
