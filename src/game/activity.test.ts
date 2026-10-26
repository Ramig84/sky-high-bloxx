import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeActivity } from "./activity";

const native = vi.hoisted(() => ({ platform: vi.fn(() => false), add: vi.fn(), state: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: native.platform } }));
vi.mock("@capacitor/app", () => ({ App: { addListener: native.add, getState: native.state } }));
const unsubscribers: (() => void)[] = [];
beforeEach(() => {
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  native.platform.mockReturnValue(false);
  native.add.mockReset();
  native.state.mockReset();
});
afterEach(() => { unsubscribers.splice(0).forEach(fn => fn()); vi.restoreAllMocks(); });

describe("foreground activity", () => {
  it("pauses on blur and does not resume a still-hidden page on focus", () => {
    let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    const change = vi.fn();
    unsubscribers.push(subscribeActivity(change));
    expect(change).toHaveBeenLastCalledWith(true);
    window.dispatchEvent(new Event("blur"));
    expect(change).toHaveBeenLastCalledWith(false);
    hidden = true;
    window.dispatchEvent(new Event("focus"));
    expect(change).toHaveBeenLastCalledWith(false);
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(change).toHaveBeenLastCalledWith(true);
  });
  it("ignores a stale native getState response after a newer activity event", async () => {
    native.platform.mockReturnValue(true);
    let callback!: (state: { isActive: boolean }) => void;
    let resolveState!: (state: { isActive: boolean }) => void;
    native.add.mockImplementation(async (_name, cb) => { callback = cb; return { remove: vi.fn(async () => {}) }; });
    native.state.mockReturnValue(new Promise(resolve => { resolveState = resolve; }));
    const change = vi.fn();
    unsubscribers.push(subscribeActivity(change));
    await vi.waitFor(() => expect(native.state).toHaveBeenCalled());
    callback({ isActive: false });
    resolveState({ isActive: true });
    await Promise.resolve();
    expect(change).toHaveBeenLastCalledWith(false);
    callback({ isActive: true });
    expect(change).toHaveBeenLastCalledWith(true);
  });
  it("removes a native subscription that arrives after unmount", async () => {
    native.platform.mockReturnValue(true);
    let resolveHandle!: (handle: { remove: () => Promise<void> }) => void;
    const remove = vi.fn(async () => {});
    native.add.mockReturnValue(new Promise(resolve => { resolveHandle = resolve; }));
    const stop = subscribeActivity(vi.fn());
    await vi.waitFor(() => expect(native.add).toHaveBeenCalled());
    stop();
    resolveHandle({ remove });
    await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(native.state).not.toHaveBeenCalled();
  });
});
