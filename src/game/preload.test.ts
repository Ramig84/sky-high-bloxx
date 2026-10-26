import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getImage, preload, retainScreenImages } from "./preload";

const mock = vi.hoisted(() => ({ decode: vi.fn(), sounds: vi.fn(() => []) }));
vi.mock("./audio", () => ({ DISTRICT_MUSIC: {}, preloadSounds: mock.sounds }));
beforeEach(() => {
  mock.decode.mockReset().mockResolvedValue(undefined);
  mock.sounds.mockClear();
  vi.stubGlobal("Image", class {
    decoding = "";
    src = "";
    decode() { return mock.decode(this.src); }
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("complete decoded screen loading", () => {
  it("deduplicates image and sound jobs", async () => {
    await preload({ images: ["unique-painting-a", "unique-painting-a"], sounds: ["tap", "tap"] });
    expect(mock.decode).toHaveBeenCalledTimes(1);
    expect(mock.sounds).toHaveBeenCalledWith(["tap"]);
  });
  it("rejects failed decoding and retries with a new image", async () => {
    mock.decode.mockRejectedValueOnce(new Error("Decode failed"));
    const first = getImage("retry-painting");
    await expect(preload({ images: ["retry-painting"], sounds: [] })).rejects.toThrow("Decode failed");
    await preload({ images: ["retry-painting"], sounds: [] });
    expect(getImage("retry-painting")).not.toBe(first);
    expect(mock.decode).toHaveBeenCalledTimes(2);
  });
  it("completes empty lists and limits progress updates on large manifests", async () => {
    const empty = vi.fn();
    await preload({ images: [], sounds: [] }, empty);
    expect(empty).toHaveBeenLastCalledWith(1);
    const progress = vi.fn();
    await preload({ images: Array.from({ length: 250 }, (_, i) => `batch-painting-${i}`), sounds: [] }, progress);
    expect(progress).toHaveBeenLastCalledWith(1);
    expect(progress.mock.calls.length).toBeLessThanOrEqual(101);
  });
  it("releases old-screen caches while keeping the new screen's decoded images", async () => {
    await preload({ images: ["old-screen-image", "current-screen-image"], sounds: [] });
    const old = getImage("old-screen-image"), current = getImage("current-screen-image");
    retainScreenImages(["current-screen-image"]);
    expect(getImage("current-screen-image")).toBe(current);
    expect(getImage("old-screen-image")).not.toBe(old);
    await preload({ images: ["old-screen-image"], sounds: [] });
    expect(mock.decode).toHaveBeenCalledTimes(3);
  });
});
