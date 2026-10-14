import { supabase } from "@/integrations/supabase/client";

export type ScoreRow = { id: string; name: string; score: number; floors: number; player_id: string };

export async function topScores(limit = 50): Promise<ScoreRow[]> {
  const { data, error } = await supabase.from("endless_scores").select("id,name,score,floors,player_id").order("score", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function submitScore(playerId: string, name: string, score: number, floors: number) {
  if (score <= 0) return;
  const { error } = await supabase.from("endless_scores").insert({ player_id: playerId, name: name.trim().slice(0, 16) || "Builder", score, floors });
  if (error) throw error;
}
