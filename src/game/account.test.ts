import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), signOut: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: mocks, rpc: mocks.rpc } }));
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
const session = { user: { id: "saved-player" }, access_token: "test-only" };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  mocks.getSession.mockResolvedValue({ data: { session } });
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("Network unavailable") });
  mocks.rpc.mockResolvedValue({ data: null });
  mocks.signOut.mockResolvedValue({ error: null });
});

it("restores Google sign-in after restarting without a successful user network request", async () => {
  let account = await import("./account");
  await account.syncAccount();
  expect(account.isSignedIn()).toBe(true);
  vi.resetModules(); // Restart the game; SDK storage still returns the saved session.
  account = await import("./account");
  expect(account.isAccountReady()).toBe(false);
  await account.syncAccount();
  expect(account.isSignedIn()).toBe(true);
  expect(account.isAccountReady()).toBe(true);
});

it("shows the restored account before the cloud wallet finishes loading", async () => {
  let finish: (value: { data: null }) => void = () => {};
  mocks.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const account = await import("./account");
  const syncing = account.syncAccount();
  await vi.waitFor(() => expect(account.isSignedIn()).toBe(true));
  finish({ data: null });
  await syncing;
});

it("does not restore a revoked or explicitly signed-out session", async () => {
  const account = await import("./account");
  await account.syncAccount();
  await account.signOut();
  expect(account.isSignedIn()).toBe(false);
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  await account.syncAccount();
  expect(account.isSignedIn()).toBe(false);
  expect(account.isAccountReady()).toBe(true);
});