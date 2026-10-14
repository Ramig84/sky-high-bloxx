CREATE TABLE public.game_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL,
  level integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  floors integer,
  perfects integer,
  stars integer,
  reward integer
);
CREATE INDEX game_runs_user_day ON public.game_runs (user_id, finished_at);
GRANT SELECT ON public.game_runs TO authenticated;
GRANT ALL ON public.game_runs TO service_role;
ALTER TABLE public.game_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own runs" ON public.game_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.daily_level_for(_day date) RETURNS integer
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE k text := to_char(_day, 'YYYYMMDD'); h bigint := 0; i integer;
BEGIN
  FOR i IN 1..length(k) LOOP h := (h * 31 + ascii(substr(k, i, 1))) % 4294967296; END LOOP;
  RETURN (h % 100)::integer;
END $$;

CREATE OR REPLACE FUNCTION public.start_game_run(_mode text, _level integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _mode NOT IN ('city','daily','endless') OR _level < 0 OR _level > 99 THEN RAISE EXCEPTION 'bad run'; END IF;
  IF _mode = 'daily' AND _level <> daily_level_for((now() AT TIME ZONE 'utc')::date) THEN RAISE EXCEPTION 'not today''s challenge'; END IF;
  PERFORM ensure_player_profile();
  -- Abandoned tickets expire so they cannot be stockpiled.
  DELETE FROM game_runs WHERE user_id = auth.uid() AND finished_at IS NULL AND started_at < now() - interval '2 hours';
  INSERT INTO game_runs(user_id, mode, level) VALUES (auth.uid(), _mode, CASE WHEN _mode = 'endless' THEN 0 ELSE _level END) RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.finish_game_run(_run uuid, _floors integer, _perfects integer, _stars integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.game_runs; d integer; l integer; goal integer; secs numeric; base integer; reward integer;
  today_total integer; daily_runs integer; fl integer; pf integer; st integer;
BEGIN
  SELECT * INTO r FROM game_runs WHERE id = _run AND user_id = auth.uid() FOR UPDATE;
  IF r.id IS NULL OR r.finished_at IS NOT NULL THEN RETURN jsonb_build_object('reward', 0, 'reason', 'used'); END IF;
  secs := extract(epoch FROM now() - r.started_at);
  fl := GREATEST(0, COALESCE(_floors, 0));
  pf := LEAST(GREATEST(0, COALESCE(_perfects, 0)), fl);
  IF r.mode = 'endless' THEN
    fl := LEAST(fl, 1000); st := 0;
  ELSE
    d := r.level / 10; l := r.level % 10;
    goal := round((15 + 5 * d) + ((50 + 10 * d) - (15 + 5 * d)) * l / 9.0);
    fl := LEAST(fl, goal);
    st := CASE WHEN fl < goal THEN 0 ELSE LEAST(GREATEST(COALESCE(_stars, 1), 1), 3) END;
    IF st >= 2 AND pf < round(goal * 0.25) THEN st := CASE WHEN st = 3 THEN 2 ELSE 1 END; END IF;
  END IF;
  -- Every floor needs a swing, a drop and a landing: at least 0.8 s each.
  IF secs < fl * 0.8 THEN
    UPDATE game_runs SET finished_at = now(), floors = fl, perfects = pf, stars = st, reward = 0 WHERE id = r.id;
    RETURN jsonb_build_object('reward', 0, 'reason', 'too_fast');
  END IF;
  base := CASE WHEN r.mode = 'endless' THEN fl * 14 + pf * 8 ELSE st * 180 + pf * 6 + fl * 3 END;
  reward := base;
  IF r.mode = 'daily' THEN
    SELECT count(*) INTO daily_runs FROM game_runs WHERE user_id = auth.uid() AND mode = 'daily' AND reward > 0
      AND finished_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
    IF daily_runs < 3 THEN reward := base * 3; END IF;
  END IF;
  SELECT COALESCE(sum(g.reward), 0) INTO today_total FROM game_runs g WHERE g.user_id = auth.uid()
    AND g.finished_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
  reward := LEAST(reward, 6000, GREATEST(0, 30000 - today_total));
  UPDATE game_runs SET finished_at = now(), floors = fl, perfects = pf, stars = st, reward = reward WHERE id = r.id;
  UPDATE player_profiles SET coins = coins + reward, last_award_at = now() WHERE user_id = auth.uid();
  RETURN jsonb_build_object('reward', reward, 'reason', CASE WHEN reward < base THEN 'capped' ELSE 'ok' END);
END $$;

REVOKE ALL ON FUNCTION public.start_game_run(text, integer), public.finish_game_run(uuid, integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_game_run(text, integer), public.finish_game_run(uuid, integer, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.award_run_coins(integer) FROM authenticated;
COMMENT ON FUNCTION public.award_run_coins(integer) IS 'DEPRECATED: replaced by start_game_run/finish_game_run';