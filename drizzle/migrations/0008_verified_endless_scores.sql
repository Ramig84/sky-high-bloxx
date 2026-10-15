ALTER TABLE public.endless_scores ADD COLUMN IF NOT EXISTS run_id uuid UNIQUE;
DROP POLICY IF EXISTS "Anyone can post a score" ON public.endless_scores;
REVOKE INSERT ON public.endless_scores FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_endless_score(_run uuid, _score integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.game_runs; nm text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT * INTO r FROM game_runs WHERE id = _run AND user_id = auth.uid();
  -- Only a finished endless run of this player, played at a humanly possible pace, may post once.
  IF r.id IS NULL OR r.mode <> 'endless' OR r.finished_at IS NULL OR COALESCE(r.floors, 0) < 1 THEN RETURN false; END IF;
  IF extract(epoch FROM r.finished_at - r.started_at) < r.floors * 0.8 THEN RETURN false; END IF;
  IF _score < 1 OR _score > r.floors * 300 + 100 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM endless_scores WHERE run_id = r.id) THEN RETURN false; END IF;
  SELECT name INTO nm FROM player_profiles WHERE user_id = auth.uid();
  INSERT INTO endless_scores(player_id, name, score, floors, run_id)
    VALUES (auth.uid(), left(COALESCE(NULLIF(trim(nm), ''), 'Builder'), 16), _score, r.floors, r.id);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.submit_endless_score(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_endless_score(uuid, integer) TO authenticated;