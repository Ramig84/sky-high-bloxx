CREATE OR REPLACE FUNCTION public.submit_space_score(_run uuid, _score integer, _landings integer, _peak_floors integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.game_runs; nm text; secs numeric;
BEGIN
  IF auth.uid() IS NULL OR _score IS NULL OR _landings IS NULL OR _peak_floors IS NULL THEN RETURN false; END IF;
  SELECT * INTO r FROM public.game_runs WHERE id = _run AND user_id = auth.uid() FOR UPDATE;
  IF r.id IS NULL OR r.mode <> 'endless' OR r.finished_at IS NULL THEN RETURN false; END IF;
  secs := extract(epoch FROM r.finished_at - r.started_at);
  IF _landings < 1 OR _peak_floors < 1 OR _peak_floors > _landings OR _peak_floors < COALESCE(r.floors,0) OR _landings > 10000 OR secs < _landings * 0.8 THEN RETURN false; END IF;
  IF _score < _landings * 10 OR _score > _landings * 250 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.space_scores WHERE run_id = r.id) THEN RETURN false; END IF;
  SELECT name INTO nm FROM public.player_profiles WHERE user_id = auth.uid();
  INSERT INTO public.space_scores(player_id, name, score, floors, zone, run_id)
    VALUES (auth.uid(), left(COALESCE(NULLIF(trim(nm), ''), 'Builder'), 16), _score, _peak_floors, public.space_zone_for(_peak_floors), r.id);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.submit_space_score(uuid, integer, integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_space_score(uuid, integer, integer, integer) TO authenticated;
COMMENT ON FUNCTION public.submit_space_score(uuid, integer, integer, integer) IS 'Space Climb cumulative landing/peak plausibility validation; reward floors and legacy submission remain unchanged. Client metrics are bounded, not a reconstructed authoritative replay.';