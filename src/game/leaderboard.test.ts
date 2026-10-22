import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const finished = vi.hoisted(() => ({ ticket: Promise.resolve<string | null>(null) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, from: vi.fn() } }));
vi.mock("./account", () => ({ get lastFinishedRun() { return finished.ticket; } }));
import { submitScore } from "./leaderboard";
beforeEach(() => { rpc.mockReset(); finished.ticket = Promise.resolve(null); });

describe("truthful leaderboard submission", () => {
  it("a zero-floor zero-score run cannot report a submitted score", async () => {
    expect(await submitScore(0)).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("a guest without a validated finished run cannot post even a positive score", async () => {
    expect(await submitScore(100)).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("submits cumulative earned landings and peak altitude independently of remaining floors", async () => {
    finished.ticket = Promise.resolve("finished-ticket"); rpc.mockResolvedValue({ data: true, error: null });
    expect(await submitScore(2500, 40, 30)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("submit_space_score", { _run: "finished-ticket", _score: 2500, _landings: 40, _peak_floors: 30 });
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
