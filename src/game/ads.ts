/** Real AdMob ads inside the Android app; web keeps the test placeholder. Swap TEST ids for live ids before store upload. */
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import type { AdPlacement } from "./adPlacements";

export const AD_UNITS = {
  rewarded: "ca-app-pub-3940256099942544/5224354917", // Google test rewarded
  interstitial: "ca-app-pub-3940256099942544/1033173712", // Google test interstitial
};
export const ADS_TESTING = true;

export const nativeAds = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

let ready: Promise<typeof import("@capacitor-community/admob")> | null = null;
function admob() {
  ready ??= import("@capacitor-community/admob").then(async m => {
    await m.AdMob.initialize({ initializeForTesting: ADS_TESTING });
    return m;
  }).catch(error => {
    ready = null; // A transient initialization failure must not poison every later attempt.
    throw error;
  });
  return ready;
}

let running: { placement: AdPlacement; promise: Promise<boolean> } | null = null;
/** One native presentation even if React remounts the loading view. */
export function showNativeAd(placement: AdPlacement): Promise<boolean> {
  if (running) return running.placement === placement ? running.promise : Promise.resolve(false);
  const promise = presentAd(placement).finally(() => { running = null; });
  running = { placement, promise };
  return promise;
}

/** Reward only after provider reward AND dismissal, with listeners removed on every exit. */
async function presentAd(placement: AdPlacement): Promise<boolean> {
  const m = await admob();
  const { AdMob } = m;
  const interstitial = placement === "five-levels";
  if (interstitial) await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial, isTesting: ADS_TESTING });
  else await AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded, isTesting: ADS_TESTING });
  const handles: PluginListenerHandle[] = [];
  let rewarded = interstitial, settled = false;
  let resolveResult!: (value: boolean) => void;
  const result = new Promise<boolean>(resolve => { resolveResult = resolve; });
  const finish = (value: boolean) => {
    if (settled) return;
    settled = true;
    for (const handle of handles) void handle.remove().catch(() => {});
    resolveResult(value);
  };
  const remember = async (handle: PluginListenerHandle) => {
    if (settled) await handle.remove();
    else handles.push(handle);
  };
  try {
    if (interstitial) {
      await remember(await AdMob.addListener(m.InterstitialAdPluginEvents.Dismissed, () => finish(true)));
      await remember(await AdMob.addListener(m.InterstitialAdPluginEvents.FailedToShow, () => finish(false)));
      if (!settled) void AdMob.showInterstitial().catch(() => finish(false));
    } else {
      await remember(await AdMob.addListener(m.RewardAdPluginEvents.Rewarded, () => { rewarded = true; }));
      await remember(await AdMob.addListener(m.RewardAdPluginEvents.Dismissed, () => finish(rewarded)));
      await remember(await AdMob.addListener(m.RewardAdPluginEvents.FailedToShow, () => finish(false)));
      if (!settled) void AdMob.showRewardVideoAd().catch(() => finish(false));
    }
  } catch {
    finish(false); // Includes listener-registration failures (no async Promise executor).
  }
  return result;
}
