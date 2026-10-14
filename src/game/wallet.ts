export const WALLET_KEY = "bloxx-coins";
export const LOADOUT_KEY = "bloxx-loadout";
export const STREAK_KEY = "bloxx-streak";

export type Loadout = { ownedCranes: string[]; ownedBlocks: string[]; crane: string; block: string };
export type RewardInput = { stars?: number; perfects: number; floors: number; endless?: boolean; daily?: boolean };

export const CRANE_PRICES = [0, 2500, 5000, 8500, 13000, 19000, 27000, 38000, 52000, 70000] as const;
export const BLOCK_PRICES = [0, 3000, 6000, 10000, 15500, 22500, 31500, 43000, 58000, 78000] as const;

const canStore = () => typeof localStorage !== "undefined";
export function coins() { return canStore() ? Math.max(0, Number(localStorage.getItem(WALLET_KEY) || 0) || 0) : 0; }
export function addCoins(amount: number) { const next = coins() + Math.max(0, Math.floor(amount)); if (canStore()) localStorage.setItem(WALLET_KEY, String(next)); return next; }
export function spendCoins(amount: number) { const cost = Math.max(0, Math.floor(amount)); if (coins() < cost) return false; if (canStore()) localStorage.setItem(WALLET_KEY, String(coins() - cost)); return true; }

export function loadLoadout(): Loadout {
  const fallback: Loadout = { ownedCranes: ["classic"], ownedBlocks: ["classic"], crane: "classic", block: "classic" };
  if (!canStore()) return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(LOADOUT_KEY) || "{}") as Partial<Loadout>;
    const ownedCranes = Array.from(new Set(["classic", ...(value.ownedCranes ?? [])]));
    const ownedBlocks = Array.from(new Set(["classic", ...(value.ownedBlocks ?? [])]));
    return { ownedCranes, ownedBlocks, crane: ownedCranes.includes(value.crane ?? "") ? value.crane ?? "classic" : "classic", block: ownedBlocks.includes(value.block ?? "") ? value.block ?? "classic" : "classic" };
  } catch { return fallback; }
}
export function saveLoadout(value: Loadout) { if (canStore()) localStorage.setItem(LOADOUT_KEY, JSON.stringify(value)); }

export function runReward({ stars = 0, perfects, floors, endless = false, daily = false }: RewardInput) {
  const base = endless ? floors * 14 + perfects * 8 : stars * 180 + perfects * 6 + floors * 3;
  return Math.max(0, Math.floor(base * (daily ? 3 : 1)));
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const previousDay = (d: Date) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() - 1); return dayKey(x); };
export function claimDailyStreak(now = new Date()) {
  const today = dayKey(now);
  let old: { day?: string; count?: number } = {};
  try { old = canStore() ? JSON.parse(localStorage.getItem(STREAK_KEY) || "{}") : {}; } catch { /* ignore */ }
  if (old.day === today) return { count: old.count ?? 1, reward: 0 };
  const count = old.day === previousDay(now) ? Math.min(7, (old.count ?? 0) + 1) : 1;
  const reward = 150 * count;
  if (canStore()) localStorage.setItem(STREAK_KEY, JSON.stringify({ day: today, count }));
  addCoins(reward);
  return { count, reward };
}

export function dailyLevel(now = new Date()) {
  const key = dayKey(now).replaceAll("-", "");
  let hash = 0; for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return hash % 100;
}
