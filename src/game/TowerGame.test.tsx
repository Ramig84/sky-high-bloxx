import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TowerGame } from "./TowerGame";
import { SPACE_ZONE_SKY } from "./spaceArtwork";

const images = vi.hoisted(() => ({ load: vi.fn((src: string) => {
  const image = new Image();
  Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 32 }, naturalHeight: { value: 64 } });
  image.src = src;
  return image;
}) }));
vi.mock("./preload", () => ({ getImage: images.load }));
vi.mock("./derivedArtwork", () => ({ starPainting: () => document.createElement("canvas") }));
vi.mock("./account", () => ({ startRun: vi.fn(async () => null), finishRun: vi.fn(async () => 0) }));
vi.mock("./audio", () => ({
  DISTRICT_MUSIC: { oldtown: "music" }, ambienceFor: () => [],
  setAmbience: vi.fn(), setMusic: vi.fn(), sfx: vi.fn(async () => {}), unlockAudio: vi.fn(),
}));
vi.mock("./ads", () => ({ nativeAds: () => false, showNativeAd: vi.fn(async () => false) }));

let callbacks: Map<number, FrameRequestCallback>, id: number, clock: number;
let bounds: { width: number; height: number };
let observers: (() => void)[];
let draw: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  callbacks = new Map(); id = 0; clock = 0; observers = [];
  bounds = { width: 320, height: 568 };
  localStorage.clear();
  localStorage.setItem("bloxx-settings", JSON.stringify({ playerId: "test-phone", sound: false, vibrate: false }));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
    ...bounds, x: 0, y: 0, top: 0, left: 0, bottom: bounds.height, right: bounds.width, toJSON: () => ({}),
  }));
  draw = vi.fn();
  const context = new Proxy({ globalAlpha: 1, drawImage: draw }, {
    get(target, key) {
      if (key in target) return Reflect.get(target, key);
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => ({ addColorStop: vi.fn() });
      return vi.fn();
    },
    set(target, key, value) { Reflect.set(target, key, value); return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { callbacks.set(++id, cb); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => callbacks.delete(key));
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { observers.push(callback); }
    observe() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function frame(ms: number) {
  clock += ms;
  const scheduled = [...callbacks.values()];
  callbacks.clear();
  act(() => scheduled.forEach(callback => callback(clock)));
}
const state = () => (window as unknown as { __bloxx: () => { t: number; phase: number; held: boolean } }).__bloxx();
const game = () => render(<TowerGame level={0} onMap={vi.fn()} onComplete={vi.fn()} />);

describe("game renderer lifecycle", () => {
  it("paints the complete scene before waiting for the first animation frame", () => {
    game();
    expect(draw).toHaveBeenCalled();
    expect(state().t).toBe(0);
    expect(callbacks.size).toBe(1);
  });
  it("does not request Space Climb skies during campaign play", () => {
    game();
    for (const source of SPACE_ZONE_SKY) expect(images.load).not.toHaveBeenCalledWith(source);
  });
  it("redraws a resized paused scene once without moving gameplay", () => {
    const view = game();
    frame(16);
    fireEvent.click(view.getByRole("button", { name: "Pause game" }));
    const before = { t: state().t, phase: state().phase };
    draw.mockClear();
    frame(100);
    expect(draw).not.toHaveBeenCalled();
    bounds = { width: 360, height: 640 };
    act(() => observers.forEach(callback => callback()));
    frame(100);
    expect(draw).toHaveBeenCalled();
    expect({ t: state().t, phase: state().phase }).toEqual(before);
    draw.mockClear();
    frame(100);
    expect(draw).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole("button", { name: "Resume" }));
    frame(8000);
    expect(state().t).toBe(before.t);
    frame(16);
    expect(state().t).toBeCloseTo(before.t + 0.016);
  });
  it("preserves manual pause after the app regains focus", () => {
    const view = game();
    frame(16);
    act(() => window.dispatchEvent(new Event("blur")));
    frame(5000);
    const time = state().t;
    act(() => window.dispatchEvent(new Event("focus")));
    frame(16);
    expect(state().t).toBe(time);
    expect(view.getByRole("dialog", { name: "Game paused" })).toBeTruthy();
  });
  it("does not reset an unchanged canvas and stops its frame loop on unmount", () => {
    const view = game();
    frame(16);
    const canvas = view.container.querySelector(".game-surface canvas") as HTMLCanvasElement;
    const width = vi.spyOn(canvas, "width", "set");
    const height = vi.spyOn(canvas, "height", "set");
    act(() => observers.forEach(callback => callback()));
    expect(width).not.toHaveBeenCalled();
    expect(height).not.toHaveBeenCalled();
    view.unmount();
    expect(callbacks.size).toBe(0);
    expect((window as unknown as { __bloxx?: unknown }).__bloxx).toBeUndefined();
  });
});
