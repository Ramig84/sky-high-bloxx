DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'finish_game_run';
  IF definition IS NULL THEN RAISE EXCEPTION 'finish_game_run not found'; END IF;
  definition := replace(definition, '  base := CASE WHEN r.mode', E'  IF r.mode <> ''endless'' AND fl < goal THEN\n    UPDATE game_runs g SET finished_at = now(), floors = fl, perfects = pf, stars = 0, reward = 0 WHERE g.id = r.id;\n    RETURN jsonb_build_object(''reward'', 0, ''reason'', ''unfinished'');\n  END IF;\n  base := CASE WHEN r.mode');
  EXECUTE definition;
END $migration$;