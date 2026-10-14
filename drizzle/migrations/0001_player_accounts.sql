CREATE TABLE public.player_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Builder',
  coins integer NOT NULL DEFAULT 0,
  owned_cranes text[] NOT NULL DEFAULT ARRAY['classic'],
  owned_blocks text[] NOT NULL DEFAULT ARRAY['classic'],
  crane text NOT NULL DEFAULT 'classic',
  block text NOT NULL DEFAULT 'classic',
  stars integer[] NOT NULL DEFAULT '{}',
  endless_best integer NOT NULL DEFAULT 0,
  streak_day date,
  streak_count integer NOT NULL DEFAULT 0,
  last_award_at timestamptz,
  guest_imported boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.player_profiles TO authenticated;
GRANT UPDATE (name, stars, endless_best) ON public.player_profiles TO authenticated;
GRANT ALL ON public.player_profiles TO service_role;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own profile" ON public.player_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Players create own profile" ON public.player_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND coins = 0 AND owned_cranes = ARRAY['classic'] AND owned_blocks = ARRAY['classic'] AND guest_imported = false);
CREATE POLICY "Players update own profile" ON public.player_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND char_length(name) BETWEEN 1 AND 16);

CREATE OR REPLACE FUNCTION public.ensure_player_profile() RETURNS public.player_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.player_profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  INSERT INTO player_profiles(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  SELECT * INTO p FROM player_profiles WHERE user_id = auth.uid();
  RETURN p;
END $$;

CREATE OR REPLACE FUNCTION public.import_guest_progress(_coins integer, _stars integer[], _best integer, _name text) RETURNS public.player_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.player_profiles;
BEGIN
  PERFORM ensure_player_profile();
  UPDATE player_profiles SET
    coins = coins + LEAST(GREATEST(COALESCE(_coins,0),0), 20000),
    stars = CASE WHEN cardinality(stars) = 0 THEN (SELECT COALESCE(array_agg(LEAST(GREATEST(COALESCE(s,0),0),3) ORDER BY i), '{}') FROM unnest(_stars[1:100]) WITH ORDINALITY AS t(s,i)) ELSE stars END,
    endless_best = GREATEST(endless_best, LEAST(GREATEST(COALESCE(_best,0),0), 100000)),
    name = CASE WHEN name = 'Builder' AND char_length(trim(COALESCE(_name,''))) BETWEEN 1 AND 16 THEN trim(_name) ELSE name END,
    guest_imported = true
  WHERE user_id = auth.uid() AND guest_imported = false;
  SELECT * INTO p FROM player_profiles WHERE user_id = auth.uid();
  RETURN p;
END $$;

CREATE OR REPLACE FUNCTION public.award_run_coins(_amount integer) RETURNS public.player_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.player_profiles;
BEGIN
  PERFORM ensure_player_profile();
  UPDATE player_profiles SET coins = coins + LEAST(GREATEST(COALESCE(_amount,0),0), 6000), last_award_at = now()
  WHERE user_id = auth.uid() AND (last_award_at IS NULL OR last_award_at < now() - interval '15 seconds');
  SELECT * INTO p FROM player_profiles WHERE user_id = auth.uid();
  RETURN p;
END $$;

CREATE OR REPLACE FUNCTION public.claim_daily_streak() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.player_profiles; today date := (now() AT TIME ZONE 'utc')::date; n integer; reward integer := 0;
BEGIN
  p := ensure_player_profile();
  IF p.streak_day = today THEN RETURN jsonb_build_object('count', p.streak_count, 'reward', 0); END IF;
  n := CASE WHEN p.streak_day = today - 1 THEN LEAST(7, p.streak_count + 1) ELSE 1 END;
  reward := 150 * n;
  UPDATE player_profiles SET streak_day = today, streak_count = n, coins = coins + reward WHERE user_id = auth.uid();
  RETURN jsonb_build_object('count', n, 'reward', reward);
END $$;

CREATE OR REPLACE FUNCTION public.buy_or_equip(_kind text, _item text) RETURNS public.player_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.player_profiles; ids text[]; prices integer[]; idx integer; owned boolean;
BEGIN
  p := ensure_player_profile();
  IF _kind = 'crane' THEN
    ids := ARRAY['classic','red','mint','copper','navy','blossom','royal','jade','midnight','gold'];
    prices := ARRAY[0,2500,5000,8500,13000,19000,27000,38000,52000,70000];
    owned := _item = ANY(p.owned_cranes);
  ELSIF _kind = 'block' THEN
    ids := ARRAY['classic','rose','tudor','azulejo','ivy','deco','marble','pagoda','star','crown'];
    prices := ARRAY[0,3000,6000,10000,15500,22500,31500,43000,58000,78000];
    owned := _item = ANY(p.owned_blocks);
  ELSE RAISE EXCEPTION 'unknown kind'; END IF;
  idx := array_position(ids, _item);
  IF idx IS NULL THEN RAISE EXCEPTION 'unknown item'; END IF;
  IF NOT owned THEN
    IF p.coins < prices[idx] THEN RAISE EXCEPTION 'not enough coins'; END IF;
    IF _kind = 'crane' THEN UPDATE player_profiles SET coins = coins - prices[idx], owned_cranes = array_append(owned_cranes, _item), crane = _item WHERE user_id = auth.uid();
    ELSE UPDATE player_profiles SET coins = coins - prices[idx], owned_blocks = array_append(owned_blocks, _item), block = _item WHERE user_id = auth.uid(); END IF;
  ELSE
    IF _kind = 'crane' THEN UPDATE player_profiles SET crane = _item WHERE user_id = auth.uid();
    ELSE UPDATE player_profiles SET block = _item WHERE user_id = auth.uid(); END IF;
  END IF;
  SELECT * INTO p FROM player_profiles WHERE user_id = auth.uid();
  RETURN p;
END $$;

REVOKE ALL ON FUNCTION public.ensure_player_profile(), public.import_guest_progress(integer, integer[], integer, text), public.award_run_coins(integer), public.claim_daily_streak(), public.buy_or_equip(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_player_profile(), public.import_guest_progress(integer, integer[], integer, text), public.award_run_coins(integer), public.claim_daily_streak(), public.buy_or_equip(text, text) TO authenticated;