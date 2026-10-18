import { describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
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