import { supabase } from "@/integrations/supabase/client";
import { lastFinishedRun } from "./account";

export type ScoreRow = { id: string; name: string; score: number; floors: number; player_id: string };

export async function topScores(limit = 50): Promise<ScoreRow[]> {
  const { data, error } = await supabase.from("endless_scores").select("id,name,score,floors,player_id").order("score", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Only signed-in players' server-verified endless runs reach the leaderboard. */
export async function submitScore(score: number) {
  if (score <= 0) return false;
  const run = await lastFinishedRun;
  if (!run) return false;
  const { data, error } = await supabase.rpc("submit_endless_score", { _run: run, _score: score });
  if (error) throw error;
  return Boolean(data);
}
