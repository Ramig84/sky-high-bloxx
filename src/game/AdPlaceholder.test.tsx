import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AdPlaceholder } from "./AdPlaceholder";

const provider = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock("./ads", () => ({ nativeAds: () => true, showNativeAd: provider.show }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("returns directly from a completed native rewarded ad without a completion screen", async () => {
  provider.show.mockResolvedValue(true);
  const reward = vi.fn();
  const close = vi.fn();
  const view = render(<AdPlaceholder placement="extra-life" onClose={close} onReward={reward} />);
  fireEvent.click(view.getByRole("button", { name: "Watch test ad" }));
  await waitFor(() => expect(reward).toHaveBeenCalledTimes(1));
  expect(close).not.toHaveBeenCalled();
});

it("does not grant a life when the native provider fails", async () => {
  provider.show.mockRejectedValue(new Error("Unavailable"));
  const reward = vi.fn();
  const close = vi.fn();
  const view = render(<AdPlaceholder placement="extra-life" onClose={close} onReward={reward} />);
  fireEvent.click(view.getByRole("button", { name: "Watch test ad" }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(reward).not.toHaveBeenCalled();
});