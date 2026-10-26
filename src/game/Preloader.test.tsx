import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Preloader } from "./Preloader";

const loader = vi.hoisted(() => ({ preload: vi.fn() }));
vi.mock("./preload", () => ({ preload: loader.preload, retainScreenImages: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("keeps a failed screen hidden and retries loading before revealing it", async () => {
  loader.preload.mockRejectedValueOnce(new Error("Missing image")).mockResolvedValueOnce(undefined);
  const assets = () => ({ images: [], sounds: [] });
  const view = render(<Preloader assets={assets}><span>Ready screen</span></Preloader>);
  expect(view.queryByText("Ready screen")).toBeNull();
  await waitFor(() => expect(view.getByRole("button", { name: "Retry loading" })).toBeTruthy());
  fireEvent.click(view.getByRole("button", { name: "Retry loading" }));
  await waitFor(() => expect(view.getByText("Ready screen")).toBeTruthy());
  expect(loader.preload).toHaveBeenCalledTimes(2);
});
