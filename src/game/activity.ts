import { Capacitor } from "@capacitor/core";

/** Browser + native activity, with no React frame commits or automatic manual-pause clearing. */
export function subscribeActivity(change: (active: boolean) => void) {
  let live = true, focused = true, nativeActive = true, revision = 0;
  let nativeHandle: { remove: () => Promise<void> } | undefined;
  const publish = () => {
    if (live) change(!document.hidden && focused && nativeActive);
  };
  const visibility = () => { revision++; publish(); };
  const blur = () => { focused = false; revision++; publish(); };
  const focus = () => { focused = true; revision++; publish(); };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", blur);
  window.addEventListener("focus", focus);
  publish();
  if (Capacitor.isNativePlatform()) {
    void import("@capacitor/app").then(async ({ App }) => {
      if (!live) return;
      nativeHandle = await App.addListener("appStateChange", ({ isActive }) => {
        nativeActive = isActive;
        // Android can retain a stale WebView focus after closing a full-screen ad.
        focused = isActive;
        revision++;
        publish();
      });
      if (!live) { await nativeHandle.remove(); return; }
      const requestedAt = revision;
      const state = await App.getState();
      if (live && requestedAt === revision) {
        nativeActive = state.isActive;
        publish();
      }
    }).catch(() => { /* Browser visibility/focus remain available if the native bridge fails. */ });
  }
  return () => {
    live = false;
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("blur", blur);
    window.removeEventListener("focus", focus);
    void nativeHandle?.remove().catch(() => {});
  };
}
