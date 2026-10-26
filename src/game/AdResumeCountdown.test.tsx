import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AdResumeCountdown } from "./AdResumeCountdown";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("keeps play paused for five seconds and resumes exactly once", () => {
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const complete = vi.fn();
  render(<AdResumeCountdown onComplete={complete} />);
  act(() => vi.advanceTimersByTime(4999));
  expect(complete).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(complete).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(5000));
  expect(complete).toHaveBeenCalledTimes(1);
});

it("does not consume the countdown while the app is hidden", () => {
  vi.useFakeTimers();
  let hidden = true;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  const complete = vi.fn();
  render(<AdResumeCountdown onComplete={complete} />);
  act(() => vi.advanceTimersByTime(8000));
  expect(complete).not.toHaveBeenCalled();
  hidden = false;
  act(() => { document.dispatchEvent(new Event("visibilitychange")); vi.advanceTimersByTime(4999); });
  expect(complete).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(complete).toHaveBeenCalledTimes(1);
});

it("cancels resuming when the game is left", () => {
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const complete = vi.fn();
  const view = render(<AdResumeCountdown onComplete={complete} />);
  view.unmount();
  act(() => vi.advanceTimersByTime(5000));
  expect(complete).not.toHaveBeenCalled();
});

it("does not count time while the WebView has lost focus", () => {
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const complete = vi.fn();
  render(<AdResumeCountdown onComplete={complete} />);
  act(() => { vi.advanceTimersByTime(2000); window.dispatchEvent(new Event("blur")); });
  act(() => vi.advanceTimersByTime(9000));
  expect(complete).not.toHaveBeenCalled();
  act(() => { window.dispatchEvent(new Event("focus")); vi.advanceTimersByTime(3000); });
  expect(complete).toHaveBeenCalledTimes(1);
});
