import { describe, expect, it } from "vitest";
import { audioMayPlay } from "./audioLifecycle";

describe("sound stays inside the active game", () => {
  it("silences sound when another window takes focus even if visibility stays visible", () => {
    expect(audioMayPlay(true, false, true, true)).toBe(false);
  });
  it("silences a hidden or dismissed page and a background native app", () => {
    expect(audioMayPlay(false, true, true, true)).toBe(false);
    expect(audioMayPlay(true, true, false, true)).toBe(false);
    expect(audioMayPlay(true, true, true, false)).toBe(false);
  });
  it("allows existing recordings only when every foreground signal is restored", () => {
    expect(audioMayPlay(true, true, true, true)).toBe(true);
  });
});