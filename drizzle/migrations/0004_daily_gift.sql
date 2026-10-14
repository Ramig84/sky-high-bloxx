alter table public.player_profiles add column if not exists last_gift_day date;

create or replace function public.claim_daily_gift()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.player_profiles%rowtype;
begin
  perform public.ensure_player_profile();
  select * into p from public.player_profiles where user_id = auth.uid() for update;
  if p.last_gift_day = current_date then
    return jsonb_build_object('reward', 0);
  end if;
  update public.player_profiles
    set coins = coins + 500, last_gift_day = current_date
    where user_id = auth.uid();
  return jsonb_build_object('reward', 500);
end;
$$;

revoke all on function public.claim_daily_gift() from public, anon;
grant execute on function public.claim_daily_gift() to authenticated;