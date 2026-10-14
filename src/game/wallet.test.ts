import { beforeEach, describe, expect, it } from "vitest";
import { BLOCK_PRICES, CRANE_PRICES, addCoins, claimDailyStreak, coins, dailyLevel, runReward, spendCoins } from "./wallet";

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
  it("grows a seven-day streak and never claims twice on one day", () => {
    expect(claimDailyStreak(new Date("2026-03-01T12:00:00Z"))).toEqual({ count: 1, reward: 150 });
    expect(claimDailyStreak(new Date("2026-03-01T20:00:00Z"))).toEqual({ count: 1, reward: 0 });
    expect(claimDailyStreak(new Date("2026-03-02T12:00:00Z"))).toEqual({ count: 2, reward: 300 });
  });
  it("gives every UTC date one shared deterministic level", () => {
    expect(dailyLevel(new Date("2026-03-01T01:00:00Z"))).toBe(dailyLevel(new Date("2026-03-01T23:00:00Z")));
  });
});
