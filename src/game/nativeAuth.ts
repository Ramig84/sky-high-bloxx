// Browser-safe rules for bringing Google sign-in back into the Android app.
// The managed sign-in service only returns to https pages on our own site, so the
// phone browser lands on /auth/app-return, which hands the result to the app link.

export const APP_SCHEME = "app.lovable.skyhighbloxx";
export const APP_PACKAGE = "app.lovable.skyhighbloxx";
export const NATIVE_CALLBACK = `${APP_SCHEME}://oauth-callback`;
export const APP_RETURN_PATH = "/auth/app-return";
export const PENDING_KEY = "bloxx-native-signin";
/** A sign-in started on the phone must come back within this window. */
export const PENDING_MAX_AGE_MS = 10 * 60 * 1000;

const FORWARDED = ["access_token", "refresh_token", "expires_in", "expires_at", "token_type", "state", "error", "error_description"];

/** Collects sign-in results from a return page's query and hash, keeping only known fields. */
export function collectReturnParams(search: string, hash: string): URLSearchParams {
  const out = new URLSearchParams();
  for (const source of [new URLSearchParams(search.replace(/^\?/, "")), new URLSearchParams(hash.replace(/^#/, ""))]) {
    for (const key of FORWARDED) { const v = source.get(key); if (v && !out.has(key)) out.set(key, v); }
  }
  return out;
}

export const hasSignInResult = (p: URLSearchParams) => Boolean((p.get("access_token") && p.get("refresh_token")) || p.get("error"));

/** Android intent link (works from Chrome) and a plain app link fallback. */
export function appReturnLinks(params: URLSearchParams) {
  const q = params.toString();
  return {
    intent: `intent://oauth-callback?${q}#Intent;scheme=${APP_SCHEME};package=${APP_PACKAGE};end`,
    scheme: `${NATIVE_CALLBACK}?${q}`,
  };
}

export type Pending = { state: string; at: number };
export type ReturnResult =
  | { kind: "tokens"; access_token: string; refresh_token: string }
  | { kind: "error"; message: string }
  | null;

/** Decides whether an incoming app link is the sign-in this phone started. */
export function readAppReturn(url: string, pending: Pending | null, now: number): ReturnResult {
  if (!url.startsWith(NATIVE_CALLBACK)) return null;
  if (!pending || now - pending.at > PENDING_MAX_AGE_MS || now < pending.at) return null;
  const qi = url.indexOf("?"), hi = url.indexOf("#");
  const search = qi >= 0 ? url.slice(qi + 1, hi > qi ? hi : undefined) : "";
  const hash = hi >= 0 ? url.slice(hi + 1) : "";
  const p = collectReturnParams(search, hash);
  const state = p.get("state");
  if (state && state !== pending.state) return null;
  const error = p.get("error");
  if (error) return { kind: "error", message: p.get("error_description") ?? error };
  const access_token = p.get("access_token"), refresh_token = p.get("refresh_token");
  if (!access_token || !refresh_token) return { kind: "error", message: "Sign in failed" };
  return { kind: "tokens", access_token, refresh_token };
}
