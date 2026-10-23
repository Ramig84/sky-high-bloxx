import { createRef } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CoinCollector, type CoinCollectorHandle } from "./CoinCollector";

vi.mock("./audio", () => ({ sfx: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
it("lets overlapping collections finish and counts every arrived coin", () => {
  const animations: { onfinish: (() => void) | null; cancel: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: () => {
    const animation = { onfinish: null as (() => void) | null, cancel: vi.fn() };
    animations.push(animation); return animation;
  } });
  const ref = createRef<CoinCollectorHandle>();
  const result = render(<CoinCollector ref={ref} />);
  const target = document.createElement("img"), counter = document.createElement("strong");
  const completed = vi.fn();
  act(() => {
    ref.current?.collect({ source: { x: 100, y: 100 }, target, counter, from: 0, to: 3, onComplete: completed });
    ref.current?.collect({ source: { x: 100, y: 100 }, target, counter, from: 3, to: 7, onComplete: completed });
  });
  expect(animations).toHaveLength(7);
  expect(animations.every(a => a.cancel.mock.calls.length === 0)).toBe(true);
  act(() => { for (const animation of animations.slice(0, 7)) animation.onfinish?.(); });
  expect(counter.textContent).toBe("7");
  expect(completed).toHaveBeenCalledTimes(2);
  result.unmount();
});

it("replaces a collapsed run preview and ignores its late coin arrivals", () => {
  const animations: { onfinish: (() => void) | null; cancel: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: () => {
    const animation = { onfinish: null as (() => void) | null, cancel: vi.fn() };
    animations.push(animation); return animation;
  } });
  const ref = createRef<CoinCollectorHandle>();
  const result = render(<CoinCollector ref={ref} />);
  const target = document.createElement("img"), counter = document.createElement("strong");
  act(() => ref.current?.collect({ source: { x: 100, y: 100 }, target, counter, from: 22, to: 44 }));
  const stale = animations.slice();
  act(() => {
    ref.current?.reset(counter, 30);
    ref.current?.collect({ source: { x: 100, y: 100 }, target, counter, from: 30, to: 52 });
    stale.forEach(animation => animation.onfinish?.());
  });
  expect(counter.textContent).toBe("30");
  expect(stale.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
  act(() => animations.slice(22, 44).forEach(animation => animation.onfinish?.()));
  expect(counter.textContent).toBe("52");
  result.unmount();
});

it("keeps the validated wallet separate from unfinished preview arrivals", () => {
  const animations: { onfinish: (() => void) | null; cancel: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: () => {
    const animation = { onfinish: null as (() => void) | null, cancel: vi.fn() };
    animations.push(animation); return animation;
  } });
  const ref = createRef<CoinCollectorHandle>();
  const result = render(<CoinCollector ref={ref} />);
  const target = document.createElement("img"), counter = document.createElement("strong");
  act(() => ref.current?.collect({ source: { x: 100, y: 100 }, target, counter, from: 0, to: 22 }));
  const stale = animations.slice();
  act(() => {
    ref.current?.reset(counter, 1000);
    ref.current?.collect({ source: { x: 100, y: 100 }, target, counter, from: 1000, to: 1022 });
    stale.forEach(animation => animation.onfinish?.());
    animations.slice(22, 44).forEach(animation => animation.onfinish?.());
  });
  expect(counter.textContent).toBe("1,022");
  result.unmount();
});