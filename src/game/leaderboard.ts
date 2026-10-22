import { supabase } from "@/integrations/supabase/client";
import { lastFinishedRun } from "./account";

export type ScoreRow = { id: string; name: string; score: number; floors: number; player_id: string; zone: number };
export type ScoreScope = "all" | "week";

/** Start of the current week (Monday 00:00 UTC), matching Postgres date_trunc('week'). */
export function weekStart(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

export async function topScores(limit = 50, scope: ScoreScope = "all"): Promise<ScoreRow[]> {
  let q = supabase.from("space_scores").select("id,name,score,floors,player_id,zone").order("score", { ascending: false }).limit(limit);
  if (scope === "week") q = q.gte("created_at", weekStart().toISOString());
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Only signed-in players' server-verified Space Climb runs reach the leaderboard. */
export async function submitScore(score: number, landings?: number, peakFloors?: number) {
  if (score <= 0) return false;
  const run = await lastFinishedRun;
  if (!run) return false;
  const { data, error } = await supabase.rpc("submit_space_score", landings !== undefined && peakFloors !== undefined ? { _run: run, _score: score, _landings: landings, _peak_floors: peakFloors } : { _run: run, _score: score });
  if (error) throw error;
  return Boolean(data);
}
