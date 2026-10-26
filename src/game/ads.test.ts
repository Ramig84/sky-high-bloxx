import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  initialize: vi.fn(), prepareInterstitial: vi.fn(), showInterstitial: vi.fn(),
  prepareRewardVideoAd: vi.fn(), showRewardVideoAd: vi.fn(), addListener: vi.fn(),
}));
vi.mock("@capacitor-community/admob", () => ({
  AdMob: fake,
  RewardAdPluginEvents: { Rewarded: "reward", Dismissed: "dismiss", FailedToShow: "failed" },
  InterstitialAdPluginEvents: { Dismissed: "interstitial-dismiss", FailedToShow: "interstitial-failed" },
}));
const callbacks = new Map<string, () => void>();
let removals: ReturnType<typeof vi.fn>[];
beforeEach(() => {
  vi.resetModules();
  Object.values(fake).forEach(fn => fn.mockReset().mockResolvedValue(undefined));
  callbacks.clear();
  removals = [];
  fake.addListener.mockImplementation(async (event, callback) => {
    callbacks.set(event, callback);
    const remove = vi.fn(async () => { callbacks.delete(event); });
    removals.push(remove);
    return { remove };
  });
});
async function start() {
  const { showNativeAd } = await import("./ads");
  const result = showNativeAd("extra-life");
  await vi.waitFor(() => expect(fake.showRewardVideoAd).toHaveBeenCalled());
  return { result, showNativeAd };
}
describe("native rewarded presentation", () => {
  it("requires the earned reward and dismissal, then removes all listeners", async () => {
    const { result } = await start();
    callbacks.get("reward")!();
    callbacks.get("dismiss")!();
    expect(await result).toBe(true);
    expect(removals).toHaveLength(3);
    removals.forEach(remove => expect(remove).toHaveBeenCalledTimes(1));
  });
  it("does not grant a reward for dismissal alone", async () => {
    const { result } = await start();
    callbacks.get("dismiss")!();
    expect(await result).toBe(false);
  });
  it("settles and cleans up when the SDK emits failed-to-show", async () => {
    const { result } = await start();
    callbacks.get("failed")!();
    expect(await result).toBe(false);
    removals.forEach(remove => expect(remove).toHaveBeenCalledTimes(1));
  });
  it("does not hang or leak when listener registration fails", async () => {
    fake.addListener.mockImplementationOnce(async () => {
      const remove = vi.fn(async () => {});
      removals.push(remove);
      return { remove };
    }).mockRejectedValueOnce(new Error("Bridge failed"));
    const { showNativeAd } = await import("./ads");
    expect(await showNativeAd("extra-life")).toBe(false);
    expect(removals[0]).toHaveBeenCalledTimes(1);
    expect(fake.showRewardVideoAd).not.toHaveBeenCalled();
  });
  it("retries initialization after a transient failure", async () => {
    fake.initialize.mockRejectedValueOnce(new Error("Not ready"));
    const { showNativeAd } = await import("./ads");
    await expect(showNativeAd("extra-life")).rejects.toThrow("Not ready");
    const result = showNativeAd("extra-life");
    await vi.waitFor(() => expect(fake.showRewardVideoAd).toHaveBeenCalled());
    callbacks.get("dismiss")!();
    expect(await result).toBe(false);
    expect(fake.initialize).toHaveBeenCalledTimes(2);
  });
  it("shares a single native presentation across a loading-view remount", async () => {
    const { result, showNativeAd } = await start();
    const remounted = showNativeAd("extra-life");
    expect(remounted).toBe(result);
    expect(fake.showRewardVideoAd).toHaveBeenCalledTimes(1);
    callbacks.get("reward")!();
    callbacks.get("dismiss")!();
    expect(await remounted).toBe(true);
  });
  it("cleans listeners after a rejected show call", async () => {
    fake.showRewardVideoAd.mockRejectedValueOnce(new Error("Unavailable"));
    const { showNativeAd } = await import("./ads");
    expect(await showNativeAd("extra-life")).toBe(false);
    removals.forEach(remove => expect(remove).toHaveBeenCalledTimes(1));
  });
  it("finishes interstitials without granting a rewarded life", async () => {
    const { showNativeAd } = await import("./ads");
    const result = showNativeAd("five-levels");
    await vi.waitFor(() => expect(fake.showInterstitial).toHaveBeenCalled());
    callbacks.get("interstitial-dismiss")!();
    expect(await result).toBe(true);
    expect(fake.showRewardVideoAd).not.toHaveBeenCalled();
    removals.forEach(remove => expect(remove).toHaveBeenCalledTimes(1));
  });
});
