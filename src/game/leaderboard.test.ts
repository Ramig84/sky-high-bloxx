import { describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, from: vi.fn() } }));
vi.mock("./account", () => ({ lastFinishedRun: Promise.resolve(null) }));
import { submitScore } from "./leaderboard";

describe("truthful leaderboard submission", () => {
  it("a zero-floor zero-score run cannot report a submitted score", async () => {
    expect(await submitScore(0)).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("a guest without a validated finished run cannot post even a positive score", async () => {
    expect(await submitScore(100)).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
import { weekStart } from "./leaderboard";
describe("weekly Space Climb board", () => {
  it("starts on Monday 00:00 UTC", () => {
    expect(weekStart(new Date("2026-10-21T19:00:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(weekStart(new Date("2026-10-19T00:30:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(weekStart(new Date("2026-10-25T23:00:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });
});
