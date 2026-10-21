CREATE TABLE public.space_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  name text NOT NULL,
  score integer NOT NULL,
  floors integer NOT NULL,
  zone integer NOT NULL DEFAULT 0,
  run_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.space_scores TO anon, authenticated;
GRANT ALL ON public.space_scores TO service_role;
ALTER TABLE public.space_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the space leaderboard" ON public.space_scores FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX space_scores_score_idx ON public.space_scores (score DESC);
CREATE INDEX space_scores_created_idx ON public.space_scores (created_at);

CREATE OR REPLACE FUNCTION public.space_zone_for(_floors integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _floors >= 500 THEN 10 WHEN _floors >= 410 THEN 9 WHEN _floors >= 330 THEN 8
    WHEN _floors >= 260 THEN 7 WHEN _floors >= 200 THEN 6 WHEN _floors >= 150 THEN 5
    WHEN _floors >= 100 THEN 4 WHEN _floors >= 75 THEN 3 WHEN _floors >= 50 THEN 2
    WHEN _floors >= 25 THEN 1 ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.submit_space_score(_run uuid, _score integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.game_runs; nm text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT * INTO r FROM game_runs WHERE id = _run AND user_id = auth.uid();
  IF r.id IS NULL OR r.mode <> 'endless' OR r.finished_at IS NULL OR COALESCE(r.floors, 0) < 1 THEN RETURN false; END IF;
  IF extract(epoch FROM r.finished_at - r.started_at) < r.floors * 0.8 THEN RETURN false; END IF;
  IF _score < 1 OR _score > r.floors * 300 + 100 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM space_scores WHERE run_id = r.id) THEN RETURN false; END IF;
  SELECT name INTO nm FROM player_profiles WHERE user_id = auth.uid();
  INSERT INTO space_scores(player_id, name, score, floors, zone, run_id)
    VALUES (auth.uid(), left(COALESCE(NULLIF(trim(nm), ''), 'Builder'), 16), _score, r.floors, public.space_zone_for(r.floors), r.id);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.submit_space_score(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_space_score(uuid, integer) TO authenticated;