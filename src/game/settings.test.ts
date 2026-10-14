import { beforeEach, describe, expect, it } from "vitest";
import { loadSettings, saveSettings, volumeValue } from "./settings";

describe("independent player volumes", () => {
  beforeEach(() => localStorage.clear());
  it("persists independent music and effects levels", () => {
    saveSettings({ ...loadSettings(), musicVolume: 0.25, soundVolume: 0.75 });
    expect(loadSettings().musicVolume).toBe(0.25);
    expect(loadSettings().soundVolume).toBe(0.75);
  });
  it("permits silence and clamps invalid ranges", () => {
    expect(volumeValue(0)).toBe(0);
    expect(volumeValue(-0.2)).toBe(0);
    expect(volumeValue(1.2)).toBe(1);
  });
});