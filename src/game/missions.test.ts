import { beforeEach, describe, expect, it } from "vitest";
import { MISSION_GOALS, MISSION_REWARDS, MISSIONS_KEY, claimGuestMission, missionProgress, missionsClaimed, missionsForDay, recordRun } from "./missions";
import { WALLET_KEY } from "./wallet";

const day = new Date(Date.UTC(2026, 9, 15, 12));

beforeEach(() => localStorage.clear());

describe("missionsForDay", () => {
  it("always returns the three mission kinds", () => {
    const kinds = missionsForDay(day).map(m => m.kind).sort();
    expect(kinds).toEqual(["floors", "perfects", "wins"]);
  });
  it("is the same for everyone on a given day and changes across days", () => {
    expect(missionsForDay(day)).toEqual(missionsForDay(new Date(Date.UTC(2026, 9, 15, 23))));
    const a = missionsForDay(day).map(m => m.tier).join();
    const all = Array.from({ length: 6 }, (_, i) => missionsForDay(new Date(Date.UTC(2026, 9, 15 + i))).map(m => m.tier).join());
    expect(new Set(all).size).toBeGreaterThan(1);
    expect(all).toContain(a);
  });
  it("only uses declared goals and rewards", () => {
    for (let i = 0; i < 30; i++) {
      for (const m of missionsForDay(new Date(Date.UTC(2026, 0, 1 + i)))) {
        expect(MISSION_GOALS[m.kind]).toContain(m.goal);
        expect(MISSION_REWARDS).toContain(m.reward);
      }
    }
  });
});

describe("guest progress", () => {
  it("adds up floors, perfects and wins across runs", () => {
    recordRun({ floors: 12, perfects: 3, stars: 2 }, day);
    recordRun({ floors: 8, perfects: 1, stars: 0 }, day);
    expect(missionProgress(day)).toEqual({ floors: 20, perfects: 4, wins: 1 });
  });
  it("resets on a new day", () => {
    recordRun({ floors: 50, perfects: 9, stars: 3 }, day);
    expect(missionProgress(new Date(Date.UTC(2026, 9, 16)))).toEqual({ floors: 0, perfects: 0, wins: 0 });
  });
  it("pays the mission reward once the goal is met, only once", () => {
    const mission = missionsForDay(day).find(m => m.kind === "perfects")!;
    recordRun({ floors: 0, perfects: mission.goal, stars: 0 }, day);
    expect(claimGuestMission("perfects", day)).toBe(mission.reward);
    expect(Number(localStorage.getItem(WALLET_KEY))).toBe(mission.reward);
    expect(claimGuestMission("perfects", day)).toBe(0);
    expect(missionsClaimed(day)).toEqual(["perfects"]);
  });
  it("refuses to pay before the goal is met", () => {
    const mission = missionsForDay(day).find(m => m.kind === "floors")!;
    recordRun({ floors: mission.goal - 1, perfects: 0, stars: 0 }, day);
    expect(claimGuestMission("floors", day)).toBe(0);
    expect(localStorage.getItem(WALLET_KEY)).toBeNull();
  });
});
