import { describe, expect, it } from "vitest";
import { phoneArtwork, tabletArtwork } from "./artwork";

describe("removed animated people", () => {
  it.each([phoneArtwork, tabletArtwork])("does not load spectators or jumping residents", artwork => {
    expect(Object.keys(artwork)).not.toContain("crowdSrc");
    expect(Object.keys(artwork)).not.toContain("residentSrc");
  });
});