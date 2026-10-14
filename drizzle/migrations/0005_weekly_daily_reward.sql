CREATE OR REPLACE FUNCTION public.claim_daily_reward()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE p public.player_profiles; today date := (now() AT TIME ZONE 'utc')::date; n integer; reward integer := 0; crane boolean := false;
BEGIN
  p := ensure_player_profile();
  IF p.last_gift_day = today THEN RETURN jsonb_build_object('day', p.streak_count, 'reward', 0, 'crane', false, 'claimed', true); END IF;
  n := CASE WHEN p.last_gift_day = today - 1 AND p.streak_count < 7 THEN p.streak_count + 1 ELSE 1 END;
  IF n = 7 THEN
    IF 'weekly' = ANY(p.owned_cranes) THEN reward := 1000; ELSE crane := true; END IF;
  ELSE reward := (ARRAY[100,150,200,250,300,400])[n]; END IF;
  UPDATE player_profiles SET last_gift_day = today, streak_day = today, streak_count = n, coins = coins + reward,
    owned_cranes = CASE WHEN crane THEN array_append(owned_cranes, 'weekly') ELSE owned_cranes END
  WHERE user_id = auth.uid();
  RETURN jsonb_build_object('day', n, 'reward', reward, 'crane', crane, 'claimed', false);
END $$;
REVOKE ALL ON FUNCTION public.claim_daily_reward() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_daily_gift() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_daily_streak() FROM authenticated;
COMMENT ON FUNCTION public.claim_daily_gift() IS 'DEPRECATED: replaced by claim_daily_reward';
COMMENT ON FUNCTION public.claim_daily_streak() IS 'DEPRECATED: replaced by claim_daily_reward';

CREATE OR REPLACE FUNCTION public.buy_or_equip(_kind text, _item text)
 RETURNS player_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE p public.player_profiles; ids text[]; prices integer[]; idx integer; owned boolean;
BEGIN
  p := ensure_player_profile();
  IF _kind = 'crane' AND _item = 'weekly' THEN
    IF NOT ('weekly' = ANY(p.owned_cranes)) THEN RAISE EXCEPTION 'reward only'; END IF;
    UPDATE player_profiles SET crane = 'weekly' WHERE user_id = auth.uid();
    SELECT * INTO p FROM player_profiles WHERE user_id = auth.uid(); RETURN p;
  END IF;
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