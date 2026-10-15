CREATE TABLE public.mission_claims (
  user_id uuid NOT NULL,
  day date NOT NULL,
  kind text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day, kind)
);
GRANT SELECT ON public.mission_claims TO authenticated;
GRANT ALL ON public.mission_claims TO service_role;
ALTER TABLE public.mission_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own mission claims" ON public.mission_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Goals and rewards are duplicated in src/game/missions.ts — keep them in sync.
CREATE OR REPLACE FUNCTION public.claim_mission(_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _offset int; _tier int; _goal int; _reward int; _progress int;
  _goals int[];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _kind NOT IN ('perfects','floors','wins') THEN RAISE EXCEPTION 'unknown mission'; END IF;
  _offset := CASE _kind WHEN 'perfects' THEN 0 WHEN 'floors' THEN 1 ELSE 2 END;
  _tier := ((extract(doy from current_date)::int + _offset) % 3);
  _goals := CASE _kind WHEN 'perfects' THEN ARRAY[6,10,15] WHEN 'floors' THEN ARRAY[40,70,120] ELSE ARRAY[1,2,3] END;
  _goal := _goals[_tier + 1];
  _reward := (ARRAY[150,250,400])[_tier + 1];
  IF _kind = 'perfects' THEN
    SELECT coalesce(sum(perfects),0) INTO _progress FROM game_runs WHERE user_id = _uid AND finished_at IS NOT NULL AND finished_at::date = current_date;
  ELSIF _kind = 'floors' THEN
    SELECT coalesce(sum(floors),0) INTO _progress FROM game_runs WHERE user_id = _uid AND finished_at IS NOT NULL AND finished_at::date = current_date;
  ELSE
    SELECT count(*) INTO _progress FROM game_runs WHERE user_id = _uid AND finished_at IS NOT NULL AND finished_at::date = current_date AND coalesce(stars,0) > 0;
  END IF;
  IF _progress < _goal THEN
    RETURN jsonb_build_object('kind',_kind,'goal',_goal,'reward',0,'progress',_progress,'claimed',false);
  END IF;
  INSERT INTO mission_claims(user_id, day, kind) VALUES (_uid, current_date, _kind) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('kind',_kind,'goal',_goal,'reward',0,'progress',_progress,'claimed',true);
  END IF;
  UPDATE player_profiles SET coins = coins + _reward WHERE user_id = _uid;
  RETURN jsonb_build_object('kind',_kind,'goal',_goal,'reward',_reward,'progress',_progress,'claimed',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.mission_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _kind text; _offset int; _tier int; _goal int; _reward int; _progress int;
  _goals int[]; _claimed boolean;
  _out jsonb := '[]'::jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  FOREACH _kind IN ARRAY ARRAY['perfects','floors','wins'] LOOP
    _offset := CASE _kind WHEN 'perfects' THEN 0 WHEN 'floors' THEN 1 ELSE 2 END;
    _tier := ((extract(doy from current_date)::int + _offset) % 3);
    _goals := CASE _kind WHEN 'perfects' THEN ARRAY[6,10,15] WHEN 'floors' THEN ARRAY[40,70,120] ELSE ARRAY[1,2,3] END;
    _goal := _goals[_tier + 1];
    _reward := (ARRAY[150,250,400])[_tier + 1];
    IF _kind = 'perfects' THEN
      SELECT coalesce(sum(perfects),0) INTO _progress FROM game_runs WHERE user_id = _uid AND finished_at IS NOT NULL AND finished_at::date = current_date;
    ELSIF _kind = 'floors' THEN
      SELECT coalesce(sum(floors),0) INTO _progress FROM game_runs WHERE user_id = _uid AND finished_at IS NOT NULL AND finished_at::date = current_date;
    ELSE
      SELECT count(*) INTO _progress FROM game_runs WHERE user_id = _uid AND finished_at IS NOT NULL AND finished_at::date = current_date AND coalesce(stars,0) > 0;
    END IF;
    SELECT EXISTS (SELECT 1 FROM mission_claims WHERE user_id = _uid AND day = current_date AND kind = _kind) INTO _claimed;
    _out := _out || jsonb_build_object('kind',_kind,'goal',_goal,'reward',_reward,'progress',_progress,'claimed',_claimed);
  END LOOP;
  RETURN _out;
END;
$$;