import { describe, expect, it } from "vitest";
import { DISTRICTS, TOTAL_LEVELS, districtCleared, isDistrictUnlocked, isLevelUnlocked, levelSpec, recordStars, starsFor } from "./levels";

describe("campaign levels", () => {
  it("has 10 districts with 10 levels each", () => {
    expect(DISTRICTS).toHaveLength(10);
    expect(TOTAL_LEVELS).toBe(100);
  });
  it("Old Town climbs from 15 to 50 floors", () => {
    expect(levelSpec(0).goal).toBe(15);
    expect(levelSpec(9).goal).toBe(50);
  });
  it("Cloud Peak finale needs 140 floors", () => expect(levelSpec(99).goal).toBe(140));
  it("goals rise inside every district and each district ends higher", () => {
    for (let d = 0; d < 10; d++) {
      for (let l = 1; l < 10; l++) expect(levelSpec(d * 10 + l).goal).toBeGreaterThan(levelSpec(d * 10 + l - 1).goal);
      if (d) expect(levelSpec(d * 10 + 9).goal).toBeGreaterThan(levelSpec(d * 10 - 1).goal);
    }
  });
  it("crane gets faster every level", () => {
    for (let i = 1; i < TOTAL_LEVELS; i++) expect(levelSpec(i).speed).toBeGreaterThan(levelSpec(i - 1).speed);
  });
  it("introduces obstacles district by district", () => {
    expect(levelSpec(9).wind + levelSpec(9).slide + levelSpec(9).slip).toBe(0);
    expect(levelSpec(20).wind).toBeGreaterThan(0);
    expect(levelSpec(39).slide).toBe(0);
    expect(levelSpec(40).slide).toBeGreaterThan(0);
    expect(levelSpec(59).slip).toBe(0);
    expect(levelSpec(60).slip).toBeGreaterThan(0);
    expect(levelSpec(70).fog).toBeGreaterThan(0);
    expect(levelSpec(79).night).toBe(false);
    expect(levelSpec(80).night).toBe(true);
    expect(levelSpec(89).width).toBe(1);
    expect(levelSpec(99).width).toBeLessThan(1);
    expect(levelSpec(99).width).toBeGreaterThanOrEqual(0.85);
  });
  it("wind grows stronger in later districts", () => {
    expect(levelSpec(99).wind).toBeGreaterThan(levelSpec(20).wind);
  });
  it("awards 1-3 stars", () => {
    const s = levelSpec(0);
    expect(starsFor(s, 14, 10, 0)).toBe(0);
    expect(starsFor(s, 15, 0, 1)).toBe(1);
    expect(starsFor(s, 15, s.perfectGoal, 1)).toBe(2);
    expect(starsFor(s, 15, s.perfectGoal, 0)).toBe(3);
  });
  it("unlocks the next level only after clearing the previous", () => {
    expect(isLevelUnlocked([], 0)).toBe(true);
    expect(isLevelUnlocked([], 1)).toBe(false);
    expect(isLevelUnlocked([1], 1)).toBe(true);
    const nine = Array(10).fill(1);
    expect(isDistrictUnlocked(nine.slice(0, 9), 1)).toBe(false);
    expect(isDistrictUnlocked(nine, 1)).toBe(true);
    expect(districtCleared(nine, 0)).toBe(true);
  });
  it("keeps the best star count", () => {
    expect(recordStars(recordStars([], 3, 2), 3, 1)[3]).toBe(2);
  });
});
