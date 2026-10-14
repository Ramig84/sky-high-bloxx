import { describe, expect, it } from "vitest";
import { effectGain } from "./audioMix";

describe("restrained coin mix", () => {
  it("softens both coin recordings without lowering gameplay effects", () => {
    expect(effectGain("coins", 1)).toBe(0.22);
    expect(effectGain("coinDing", 1)).toBe(0.22);
    expect(effectGain("drop", 0.8)).toBe(0.8);
  });
});