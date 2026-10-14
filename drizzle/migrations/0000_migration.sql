CREATE TABLE public.endless_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 16),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 1000000),
  floors integer NOT NULL CHECK (floors BETWEEN 0 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.endless_scores TO anon, authenticated;
GRANT ALL ON public.endless_scores TO service_role;
ALTER TABLE public.endless_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the leaderboard" ON public.endless_scores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can post a score" ON public.endless_scores FOR INSERT TO anon, authenticated WITH CHECK (score <= floors * 300 + 100);
CREATE INDEX endless_scores_score_idx ON public.endless_scores (score DESC);