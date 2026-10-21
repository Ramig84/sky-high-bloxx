import { describe, expect, it } from "vitest";
import { SPACE_SKY_IMAGES, SPACE_ZONE_SKY } from "./spaceArtwork";
import { SPACE_ZONES } from "./spaceClimb";

describe("Space Climb painted skies", () => {
  it("gives every zone exactly one sky painting", () => {
    expect(SPACE_ZONE_SKY).toHaveLength(SPACE_ZONES.length);
    expect(SPACE_ZONE_SKY.every(src => typeof src === "string" && src.length > 0)).toBe(true);
  });
  it("keeps the eight approved paintings distinct and preloaded", () => {
    expect(new Set(SPACE_SKY_IMAGES).size).toBe(8);
    expect(SPACE_SKY_IMAGES.every(src => SPACE_ZONE_SKY.includes(src))).toBe(true);
  });
  it("carries each approved painting into its own zone", () => {
    for (let i = 0; i < 8; i++) expect(SPACE_ZONE_SKY[i]).toBe(SPACE_SKY_IMAGES[i]);
  });
});
