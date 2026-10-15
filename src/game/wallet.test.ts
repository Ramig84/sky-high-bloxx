import { beforeEach, describe, expect, it } from "vitest";
import { BLOCK_PRICES, CRANE_PRICES, addCoins, claimDailyReward, coins, dailyLevel, loadLoadout, runReward, spendCoins } from "./wallet";

beforeEach(() => localStorage.clear());
describe("premium coin economy", () => {
  it("uses expensive prices that rise to 70,000 and 78,000 coins", () => {
    expect(CRANE_PRICES[1]).toBe(2500); expect(CRANE_PRICES[9]).toBe(70000);
    expect(BLOCK_PRICES[1]).toBe(3000); expect(BLOCK_PRICES[9]).toBe(78000);
  });
  it("never spends coins the player does not own", () => {
    addCoins(2499); expect(spendCoins(2500)).toBe(false); expect(coins()).toBe(2499);
    addCoins(1); expect(spendCoins(2500)).toBe(true); expect(coins()).toBe(0);
  });
  it("triples the same run reward for the daily challenge", () => {
    const normal = runReward({ stars: 2, perfects: 5, floors: 20 });
    expect(runReward({ stars: 2, perfects: 5, floors: 20, daily: true })).toBe(normal * 3);
  });
  it("gives every UTC date one shared deterministic level", () => {
    expect(dailyLevel(new Date("2026-03-01T01:00:00Z"), [])).toBe(dailyLevel(new Date("2026-03-01T23:00:00Z"), []));
  });
});

describe("weekly daily reward", () => {
  beforeEach(() => localStorage.clear());
  const d = (n: number) => new Date(Date.UTC(2026, 2, n, 12));
  it("starts at 100 coins and pays once per day", () => {
    expect(claimDailyReward(d(1))).toMatchObject({ day: 1, reward: 100 });
    expect(claimDailyReward(d(1)).reward).toBe(0);
    expect(coins()).toBe(100);
  });
  it("ramps for six days, gives the crane on day 7, then restarts at 100", () => {
    const got = [1, 2, 3, 4, 5, 6].map(n => claimDailyReward(d(n)).reward);
    expect(got).toEqual([100, 150, 200, 250, 300, 400]);
    expect(claimDailyReward(d(7))).toMatchObject({ day: 7, reward: 0, crane: true });
    expect(loadLoadout().ownedCranes).toContain("weekly");
    expect(claimDailyReward(d(8))).toMatchObject({ day: 1, reward: 100 });
  });
  it("pays 1,000 coins on day 7 once the crane is owned", () => {
    for (let n = 1; n <= 7; n++) claimDailyReward(d(n));
    for (let n = 8; n <= 13; n++) claimDailyReward(d(n));
    expect(claimDailyReward(d(14))).toMatchObject({ day: 7, reward: 1000, crane: false });
  });
  it("restarts at day 1 after a missed day", () => {
    claimDailyReward(d(1)); claimDailyReward(d(2));
    expect(claimDailyReward(d(4))).toMatchObject({ day: 1, reward: 100 });
  });
});
