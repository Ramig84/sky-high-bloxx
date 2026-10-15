import { describe, expect, it } from "vitest";
import { homeAssets, levelAssets } from "./preload";
import { coin } from "./shopArtwork";

describe("coin artwork readiness", () => {
  it("loads wallet artwork before home appears", () => {
    expect(homeAssets().images).toContain(coin);
  });
  it("loads reward artwork before gameplay appears", () => {
    expect(levelAssets("oldtown").images).toContain(coin);
  });
});