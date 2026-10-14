CREATE OR REPLACE FUNCTION public.finish_game_run(_run uuid, _floors integer, _perfects integer, _stars integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.game_runs; d integer; l integer; goal integer; secs numeric; base integer; v_reward integer;
  today_total integer; daily_runs integer; fl integer; pf integer; st integer;
  day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
BEGIN
  SELECT * INTO r FROM game_runs g WHERE g.id = _run AND g.user_id = auth.uid() FOR UPDATE;
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
    IF st >= 2 AND pf < round(goal * 0.25) THEN st := st - 1; END IF;
  END IF;
  IF secs < fl * 0.8 THEN
    UPDATE game_runs g SET finished_at = now(), floors = fl, perfects = pf, stars = st, reward = 0 WHERE g.id = r.id;
    RETURN jsonb_build_object('reward', 0, 'reason', 'too_fast');
  END IF;
  base := CASE WHEN r.mode = 'endless' THEN fl * 14 + pf * 8 ELSE st * 180 + pf * 6 + fl * 3 END;
  v_reward := base;
  IF r.mode = 'daily' THEN
    SELECT count(*) INTO daily_runs FROM game_runs g WHERE g.user_id = auth.uid() AND g.mode = 'daily' AND g.reward > 0 AND g.finished_at >= day_start;
    IF daily_runs < 3 THEN v_reward := base * 3; END IF;
  END IF;
  SELECT COALESCE(sum(g.reward), 0) INTO today_total FROM game_runs g WHERE g.user_id = auth.uid() AND g.finished_at >= day_start;
  v_reward := LEAST(v_reward, 6000, GREATEST(0, 30000 - today_total));
  UPDATE game_runs g SET finished_at = now(), floors = fl, perfects = pf, stars = st, reward = v_reward WHERE g.id = r.id;
  UPDATE player_profiles p SET coins = p.coins + v_reward, last_award_at = now() WHERE p.user_id = auth.uid();
  RETURN jsonb_build_object('reward', v_reward, 'reason', CASE WHEN v_reward < base THEN 'capped' ELSE 'ok' END);
END $$;