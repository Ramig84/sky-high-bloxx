/** Real AdMob ads inside the Android app; web keeps the test placeholder. Swap TEST ids for live ids before store upload. */
import { Capacitor } from "@capacitor/core";
import type { AdPlacement } from "./adPlacements";
import { logAdEvent } from "./adDebug";

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

/** The game registers these so its graphics memory is freed while a full-screen ad video plays. */
type AdSurfaces = { release: () => void; restore: () => void };
let surfaces: AdSurfaces | null = null;
export const setAdSurfaces = (next: AdSurfaces | null) => { surfaces = next; };

/** Shows a real ad, releasing the game's drawing memory first and rebuilding it afterwards. */
export async function showNativeAd(placement: AdPlacement): Promise<boolean> {
  logAdEvent(`ad requested (${placement})`);
  surfaces?.release();
  try { const ok = await showAd(placement); logAdEvent(`ad closed (${ok ? "rewarded" : "no reward"})`); return ok; }
  finally { await new Promise(r => setTimeout(r, 250)); surfaces?.restore(); logAdEvent("game surface rebuilt"); }
}

/** Test-build checks that isolate which part of a Google ad slows the game. */
export async function debugPretendAd() {
  logAdEvent("TEST 1 pretend ad: start");
  surfaces?.release();
  await new Promise(r => setTimeout(r, 5000));
  surfaces?.restore();
  logAdEvent("TEST 1 pretend ad: done");
}
export async function debugLoadOnlyAd() {
  logAdEvent("TEST 2 load only: start");
  const m = await admob();
  await m.AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded, isTesting: ADS_TESTING });
  logAdEvent("TEST 2 load only: ad loaded, not shown");
}
export async function debugWatchAd() {
  logAdEvent("TEST 3 watch ad: start");
  await showNativeAd("extra-life");
  logAdEvent("TEST 3 watch ad: done");
}

/** Shows a real ad. Resolves true when a rewarded ad was fully watched (or an interstitial closed). */
async function showAd(placement: AdPlacement): Promise<boolean> {
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
    logAdEvent("ad loaded, opening");
    try { await AdMob.showRewardVideoAd(); } catch { void r.remove(); void d.remove(); resolve(false); }
  });
}
