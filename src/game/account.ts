// Signed-in player accounts: the server owns coins and Market items; the device keeps a cache for instant UI.
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LOADOUT_KEY, WALLET_KEY, addCoins, coins, loadLoadout } from "./wallet";
import { loadSettings, saveSettings } from "./settings";
import { loadStars, saveStars, type Stars } from "./levels";

type Profile = { name: string; coins: number; owned_cranes: string[]; owned_blocks: string[]; crane: string; block: string; stars: number[]; endless_best: number };
export const ACCOUNT_EVENT = "bloxx-account";
let signedIn = false;
export const isSignedIn = () => signedIn;
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
export async function syncAccount() {
  const { data } = await supabase.auth.getUser();
  signedIn = Boolean(data.user);
  if (!signedIn) { notify(); return; }
  const imported = await supabase.rpc("import_guest_progress", {
    _coins: coins(), _stars: loadStars(), _best: Number(localStorage.getItem("bloxx-endless-best") || 0), _name: loadSettings().name,
  });
  if (imported.data) cache(imported.data as Profile);
  void pushProgress();
}

export async function signIn() {
  const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (r.error) throw r.error;
}
export async function signOut() {
  await supabase.auth.signOut();
  // Account coins stay in the account; the phone goes back to an empty guest wallet.
  localStorage.removeItem(WALLET_KEY); localStorage.removeItem(LOADOUT_KEY);
  signedIn = false; notify();
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
export async function finishRun(ticket: Promise<string | null>, stats: { floors: number; perfects: number; stars: number }, guestReward: number): Promise<number> {
  const id = await ticket;
  if (!id && !signedIn) { addCoins(guestReward); return guestReward; }
  if (!id) return 0;
  const { data } = await supabase.rpc("finish_game_run", { _run: id, _floors: stats.floors, _perfects: stats.perfects, _stars: stats.stars });
  await syncAccount();
  return Number((data as { reward?: number } | null)?.reward ?? 0);
}

export async function claimStreak(): Promise<{ count: number; reward: number } | null> {
  if (!signedIn) return null;
  const { data } = await supabase.rpc("claim_daily_streak");
  await syncAccount();
  return data as { count: number; reward: number } | null;
}

/** Signed-in daily gift: the server pays 500 coins once per day. Returns coins granted. */
export async function claimGift(): Promise<number> {
  if (!signedIn) return 0;
  const { data } = await supabase.rpc("claim_daily_gift");
  await syncAccount();
  return Number((data as { reward?: number } | null)?.reward ?? 0);
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
