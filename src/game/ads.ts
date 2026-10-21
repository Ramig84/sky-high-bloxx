/** Real AdMob ads inside the Android app; web keeps the test placeholder. Swap TEST ids for live ids before store upload. */
import { Capacitor } from "@capacitor/core";
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
  });
  return ready;
}

/** Shows a real ad. Resolves true when a rewarded ad was fully watched (or an interstitial closed). */
export async function showNativeAd(placement: AdPlacement): Promise<boolean> {
  const m = await admob();
  const { AdMob } = m;
  if (placement === "five-levels") {
    await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial, isTesting: ADS_TESTING });
    return new Promise(async resolve => {
      const h = await AdMob.addListener(m.InterstitialAdPluginEvents.Dismissed, () => { void h.remove(); resolve(true); });
      try { await AdMob.showInterstitial(); } catch { void h.remove(); resolve(true); }
    });
  }
  await AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded, isTesting: ADS_TESTING });
  return new Promise(async resolve => {
    let rewarded = false;
    const r = await AdMob.addListener(m.RewardAdPluginEvents.Rewarded, () => { rewarded = true; });
    const d = await AdMob.addListener(m.RewardAdPluginEvents.Dismissed, () => { void r.remove(); void d.remove(); resolve(rewarded); });
    try { await AdMob.showRewardVideoAd(); } catch { void r.remove(); void d.remove(); resolve(false); }
  });
}
