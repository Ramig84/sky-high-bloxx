import { describe, expect, it } from "vitest";
import { DISTRICTS, TOTAL_LEVELS, districtCleared, isDistrictUnlocked, isLevelUnlocked, isTestingDistrictAvailable, isTestingLevelAvailable, levelSpec, recordStars, starsFor } from "./levels";

describe("campaign levels", () => {
  it("opens all 100 levels for testing without earning stars or clearing districts", () => {
    const stars: number[] = [];
    for (let i = 0; i < 100; i++) expect(isTestingLevelAvailable(stars, i)).toBe(true);
    expect(stars).toEqual([]);
    for (let d = 0; d < 10; d++) expect(districtCleared(stars, d)).toBe(false);
    for (const i of [-1, 0.5, 100, NaN]) expect(isTestingLevelAvailable(stars, i)).toBe(false);
  });
  it("opens all 10 districts for testing while retaining normal release locks", () => {
    for (let d = 0; d < 10; d++) expect(isTestingDistrictAvailable([], d)).toBe(true);
    expect(isLevelUnlocked([], 99)).toBe(false);
    for (const d of [-1, 0.5, 10, NaN]) expect(isTestingDistrictAvailable([], d)).toBe(false);
  });
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
    expect(levelSpec(10).speed).toBeCloseTo(8.1);
    expect(levelSpec(99).speed).toBeCloseTo(80.19);
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
  it("keeps level 8 locked when levels 4–7 are unfinished, even with an isolated level 7 win", () => {
    const saved = [2, 2, 1, 0, 0, 0, 3];
    expect(isLevelUnlocked(saved, 3)).toBe(true);
    for (let level = 4; level <= 9; level++) expect(isLevelUnlocked(saved, level)).toBe(false);
    expect(saved[6]).toBe(3);
    expect(isLevelUnlocked([2, 2, 1, 1, 1, 1, 3], 7)).toBe(true);
  });
  it("does not open later districts across a gap in any earlier district", () => {
    for (let district = 1; district < 10; district++) {
      const saved = Array(district * 10).fill(1);
      saved[0] = 0;
      expect(isDistrictUnlocked(saved, district)).toBe(false);
      saved[0] = 1;
      expect(isDistrictUnlocked(saved, district)).toBe(true);
    }
  });
  it("does not count a district as cleared from an isolated finale win", () => {
    expect(districtCleared([2, 2, 1, 0, 0, 0, 3, 0, 0, 1], 0)).toBe(false);
    expect(districtCleared(Array(10).fill(1), 0)).toBe(true);
  });
  it("rejects campaign level indexes outside the 100-level campaign", () => {
    for (const index of [-1, 0.5, 100, NaN]) expect(isLevelUnlocked(Array(100).fill(3), index)).toBe(false);
  });
});
