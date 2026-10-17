// Signed-in player accounts: the server owns coins and Market items; the device keeps a cache for instant UI.
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Session } from "@supabase/supabase-js";
import { LOADOUT_KEY, WALLET_KEY, addCoins, coins, loadLoadout, type DailyReward } from "./wallet";
import { loadSettings, saveSettings } from "./settings";
import { loadStars, saveStars, type Stars } from "./levels";

type Profile = { name: string; coins: number; owned_cranes: string[]; owned_blocks: string[]; crane: string; block: string; stars: number[]; endless_best: number };
export const ACCOUNT_EVENT = "bloxx-account";
let signedIn = false;
let accountReady = false;
let syncVersion = 0;
export const isSignedIn = () => signedIn;
export const isAccountReady = () => accountReady;
const notify = () => window.dispatchEvent(new Event(ACCOUNT_EVENT));

function cache(p: Profile) {
  localStorage.setItem(WALLET_KEY, String(p.coins));
  localStorage.setItem(LOADOUT_KEY, JSON.stringify({ ownedCranes: p.owned_cranes, ownedBlocks: p.owned_blocks, crane: p.crane, block: p.block }));
  const local = loadStars();
  saveStars(Array.from({ length: Math.max(local.length, p.stars.length) }, (_, i) => Math.max(local[i] ?? 0, p.stars[i] ?? 0)));
  localStorage.setItem("bloxx-endless-best", String(Math.max(p.endless_best, Number(localStorage.getItem("bloxx-endless-best") || 0))));
  saveSettings({ ...loadSettings(), name: p.name });
  notify();
}

/** Called on start and whenever sign-in changes. First sign-in moves this phone's progress into the account once. */
export async function syncAccount(restoredSession?: Session | null) {
  const version = ++syncVersion;
  // The SDK restores/refreshes its persisted session. A temporary /user network
  // failure must not make a saved account look signed out; RLS still verifies RPCs.
  const session = restoredSession === undefined
    ? (await supabase.auth.getSession()).data.session
    : restoredSession;
  if (version !== syncVersion) return;
  signedIn = Boolean(session);
  accountReady = true;
  notify(); // Show the restored account before waiting for cloud progress.
  if (!session) return;
  const imported = await supabase.rpc("import_guest_progress", {
    _coins: coins(), _stars: loadStars(), _best: Number(localStorage.getItem("bloxx-endless-best") || 0), _name: loadSettings().name,
  });
  if (version !== syncVersion) return;
  if (imported.data) cache(imported.data as Profile);
  void pushProgress();
}

export async function signIn() {
  if (Capacitor.isNativePlatform()) return signInNative();
  const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (r.error) throw r.error;
}

/** Native APK: Google sign-in runs in the phone browser and returns via the app deep link, never leaving the player on the website. */
const NATIVE_CALLBACK = "app.lovable.skyhighbloxx://oauth-callback";
async function signInNative(): Promise<void> {
  const { App } = await import("@capacitor/app");
  const state = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join("");
  const params = new URLSearchParams({ provider: "google", redirect_uri: NATIVE_CALLBACK, state });
  const url = `${window.location.origin}/~oauth/initiate?${params.toString()}`;
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void handle.then(h => h.remove());
      if (error) reject(error); else resolve();
    };
    const handle = App.addListener("appUrlOpen", ({ url: callback }) => {
      if (!callback.startsWith(NATIVE_CALLBACK)) return;
      // Tokens arrive as query params or in the hash fragment.
      const q = callback.indexOf("?") >= 0 ? callback.slice(callback.indexOf("?") + 1) : "";
      const h = callback.indexOf("#") >= 0 ? callback.slice(callback.indexOf("#") + 1) : "";
      const data = new URLSearchParams(q.includes("=") ? q : h);
      const dataHash = new URLSearchParams(h);
      const pick = (key: string) => data.get(key) ?? dataHash.get(key);
      if (pick("state") !== state) return;
      const err = pick("error");
      if (err) { finish(new Error(pick("error_description") ?? err)); return; }
      const access = pick("access_token"), refresh = pick("refresh_token");
      if (!access || !refresh) { finish(new Error("Sign in failed")); return; }
      void supabase.auth.setSession({ access_token: access, refresh_token: refresh })
        .then(({ error }) => finish(error ? new Error(error.message) : undefined));
    });
    const timer = setTimeout(() => finish(new Error("Sign in was cancelled")), 120_000);
    window.open(url, "_blank");
  });
}
export async function signOut() {
  await supabase.auth.signOut();
  ++syncVersion;
  // Account coins stay in the account; the phone goes back to an empty guest wallet.
  localStorage.removeItem(WALLET_KEY); localStorage.removeItem(LOADOUT_KEY);
  signedIn = false; accountReady = true; notify();
}

export type RunMode = "city" | "daily" | "endless";
/** Signed-in runs get a server ticket at start; the server later judges the result against it. */
export async function startRun(mode: RunMode, level: number): Promise<string | null> {
  // Check the session directly so a game started before account sync still gets a ticket.
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;
  const { data, error } = await supabase.rpc("start_game_run", { _mode: mode, _level: level });
  return error ? null : (data as string);
}
/** Returns the coins actually granted; the server recomputes and caps the reward itself. */
/** Resolves to the most recently finished signed-in run, used to post verified leaderboard scores. */
export let lastFinishedRun: Promise<string | null> = Promise.resolve(null);
export async function finishRun(ticket: Promise<string | null>, stats: { floors: number; perfects: number; stars: number }, guestReward: number): Promise<number> {
  let done!: (v: string | null) => void;
  lastFinishedRun = new Promise(r => { done = r; });
  try { return await finishRunInner(ticket, stats, guestReward, done); } finally { done(null); }
}
async function finishRunInner(ticket: Promise<string | null>, stats: { floors: number; perfects: number; stars: number }, guestReward: number, done: (v: string | null) => void): Promise<number> {
  const id = await ticket;
  if (!id && !signedIn) { addCoins(guestReward); return guestReward; }
  if (!id) return 0;
  const { data } = await supabase.rpc("finish_game_run", { _run: id, _floors: stats.floors, _perfects: stats.perfects, _stars: stats.stars });
  done(id);
  await syncAccount();
  return Number((data as { reward?: number } | null)?.reward ?? 0);
}

/** Signed-in weekly daily reward, paid by the server. */
export async function claimGift(): Promise<DailyReward | null> {
  if (!signedIn) return null;
  const { data } = await supabase.rpc("claim_daily_reward");
  await syncAccount();
  return data as DailyReward | null;
}

export type MissionStatus = { kind: "perfects" | "floors" | "wins"; goal: number; reward: number; progress: number; claimed: boolean };
/** Signed-in daily missions: the server judges progress from the player's recorded runs. */
export async function missionStatus(): Promise<MissionStatus[] | null> {
  if (!signedIn) return null;
  const { data } = await supabase.rpc("mission_status");
  return (data as MissionStatus[] | null) ?? null;
}
export async function claimMission(kind: MissionStatus["kind"]): Promise<MissionStatus | null> {
  if (!signedIn) return null;
  const { data } = await supabase.rpc("claim_mission", { _kind: kind });
  await syncAccount();
  return data as MissionStatus | null;
}

export async function buyOrEquip(kind: "crane" | "block", item: string) {
  const { data, error } = await supabase.rpc("buy_or_equip", { _kind: kind, _item: item });
  if (error) throw error;
  cache(data as Profile);
  return loadLoadout();
}

/** Stars, best and name are pushed after games; coins never are. */
export async function pushProgress(stars: Stars = loadStars()) {
  if (!signedIn) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("player_profiles").update({
    stars: stars.map(s => Math.max(0, Math.min(3, s ?? 0))).slice(0, 100),
    endless_best: Number(localStorage.getItem("bloxx-endless-best") || 0),
    name: loadSettings().name.trim().slice(0, 16) || "Builder",
  }).eq("user_id", data.user.id);
}
