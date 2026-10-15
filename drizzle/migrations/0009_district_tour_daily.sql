CREATE OR REPLACE FUNCTION public.tour_district_for(_day date) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT (((_day - DATE '1970-01-01') * 3) % 10)::integer $$;

DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef('public.start_game_run(text,integer)'::regprocedure) INTO def;
  def := replace(def, '_level <> daily_level_for((now() AT TIME ZONE ''utc'')::date)', '_level / 10 <> tour_district_for((now() AT TIME ZONE ''utc'')::date)');
  IF position('tour_district_for' IN def) = 0 THEN RAISE EXCEPTION 'start_game_run daily check not found'; END IF;
  EXECUTE def;
END $$;
COMMENT ON FUNCTION public.daily_level_for(date) IS 'DEPRECATED: replaced by tour_district_for';