// Daily missions: three shared missions per day, same for every player.
// Goals and rewards are duplicated in the claim_mission SQL function — keep them in sync.
import { addCoins } from "./wallet";

export type MissionKind = "perfects" | "floors" | "wins";
export type Mission = { kind: MissionKind; tier: number; goal: number; reward: number };

export const MISSION_KINDS: readonly MissionKind[] = ["perfects", "floors", "wins"];
export const MISSION_GOALS: Record<MissionKind, readonly number[]> = {
  perfects: [6, 10, 15],
  floors: [40, 70, 120],
  wins: [1, 2, 3],
};
export const MISSION_REWARDS = [150, 250, 400] as const;
export const MISSION_LABELS: Record<MissionKind, (goal: number) => string> = {
  perfects: g => `Land ${g} Perfect drops`,
  floors: g => `Build ${g} floors`,
  wins: g => g === 1 ? "Win 1 level" : `Win ${g} levels`,
};

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const dayOfYear = (d: Date) =>
  Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;

/** The three missions of the day; tiers rotate so every player worldwide gets the same set. */
export function missionsForDay(now = new Date()): Mission[] {
  const doy = dayOfYear(now);
  return MISSION_KINDS.map((kind, i) => {
    const tier = (doy + i) % 3;
    return { kind, tier, goal: MISSION_GOALS[kind][tier] ?? 1, reward: MISSION_REWARDS[tier] ?? 150 };
  });
}

// ---- Guest progress (this phone only). Signed-in players are judged by the server from their runs. ----
export const MISSIONS_KEY = "bloxx-missions";
type MissionState = { day?: string; progress?: Partial<Record<MissionKind, number>>; claimed?: MissionKind[] };

const canStore = () => typeof localStorage !== "undefined";
function state(): MissionState {
  try { return canStore() ? JSON.parse(localStorage.getItem(MISSIONS_KEY) || "{}") : {}; } catch { return {}; }
}
function freshState(now: Date): Required<MissionState> {
  const s = state();
  if (s.day === dayKey(now)) return { day: s.day, progress: s.progress ?? {}, claimed: s.claimed ?? [] };
  return { day: dayKey(now), progress: {}, claimed: [] };
}
function save(s: Required<MissionState>) { if (canStore()) localStorage.setItem(MISSIONS_KEY, JSON.stringify(s)); }

/** Called after every finished run so mission progress grows through the day. */
export function recordRun(stats: { floors: number; perfects: number; stars: number }, now = new Date()) {
  const s = freshState(now);
  s.progress.floors = (s.progress.floors ?? 0) + Math.max(0, stats.floors);
  s.progress.perfects = (s.progress.perfects ?? 0) + Math.max(0, stats.perfects);
  if (stats.stars > 0) s.progress.wins = (s.progress.wins ?? 0) + 1;
  save(s);
}

export function missionProgress(now = new Date()): Record<MissionKind, number> {
  const s = freshState(now);
  return { perfects: s.progress.perfects ?? 0, floors: s.progress.floors ?? 0, wins: s.progress.wins ?? 0 };
}
export function missionsClaimed(now = new Date()): MissionKind[] { return freshState(now).claimed; }

/** Guest claim; pays coins locally. Signed-in players claim via account.claimMission instead. */
export function claimGuestMission(kind: MissionKind, now = new Date()): number {
  const s = freshState(now);
  if (s.claimed.includes(kind)) return 0;
  const mission = missionsForDay(now).find(m => m.kind === kind);
  if (!mission) return 0;
  if ((s.progress[kind] ?? 0) < mission.goal) return 0;
  s.claimed.push(kind);
  save(s);
  addCoins(mission.reward);
  return mission.reward;
}
