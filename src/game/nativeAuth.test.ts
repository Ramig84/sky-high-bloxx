import { expect, it } from "vitest";
import { appReturnLinks, collectReturnParams, hasSignInResult, readAppReturn } from "./nativeAuth";

const pending = { state: "s1", at: 1_000 };

it("forwards tokens from the website return page into the Android app link", () => {
  const p = collectReturnParams("", "#access_token=a&refresh_token=r&state=s1&junk=x");
  expect(hasSignInResult(p)).toBe(true);
  const { intent } = appReturnLinks(p);
  expect(intent).toBe("intent://oauth-callback?access_token=a&refresh_token=r&state=s1#Intent;scheme=app.lovable.skyhighbloxx;package=app.lovable.skyhighbloxx;end");
});

it("signs the app in from the returned link when it matches the started sign-in", () => {
  expect(readAppReturn("app.lovable.skyhighbloxx://oauth-callback?access_token=a&refresh_token=r&state=s1", pending, 2_000))
    .toEqual({ kind: "tokens", access_token: "a", refresh_token: "r" });
});

it("ignores a return link with another sign-in's state", () => {
  expect(readAppReturn("app.lovable.skyhighbloxx://oauth-callback?access_token=a&refresh_token=r&state=evil", pending, 2_000)).toBeNull();
});

it("ignores return links when this phone did not start a sign-in in the last 10 minutes", () => {
  const url = "app.lovable.skyhighbloxx://oauth-callback?access_token=a&refresh_token=r";
  expect(readAppReturn(url, null, 2_000)).toBeNull();
  expect(readAppReturn(url, pending, 1_000 + 10 * 60 * 1000 + 1)).toBeNull();
});

it("reports a cancelled Google sign-in as an error", () => {
  expect(readAppReturn("app.lovable.skyhighbloxx://oauth-callback?error=access_denied&state=s1", pending, 2_000))
    .toEqual({ kind: "error", message: "access_denied" });
});

it("does not treat a visit without results as a sign-in", () => {
  expect(hasSignInResult(collectReturnParams("?foo=1", ""))).toBe(false);
});
