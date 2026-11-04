-- Administrative app_metadata.ai_access is required. Never trust user_metadata.
create table public.ai_usage (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('food','workout','meals','review')),
  created_at timestamptz not null default now()
);
create index ai_usage_created on public.ai_usage(created_at);
create index ai_usage_user_created on public.ai_usage(user_id,created_at);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;
create policy ai_usage_owner on public.ai_usage for select to authenticated using (user_id = auth.uid());
create function public.fitness_ai_quota() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare day_start timestamptz := date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
month_start timestamptz := date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
daily_count int; monthly_count int;
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->>'ai_access'='true') then raise exception 'AI access denied'; end if;
  select count(*) into daily_count from public.ai_usage where user_id=auth.uid() and created_at>=day_start;
  select count(*) into monthly_count from public.ai_usage where created_at>=month_start;
  return jsonb_build_object('dailyRemaining',greatest(0,5-daily_count),'monthlyRemaining',greatest(0,50-monthly_count));
end $$;
create function public.fitness_reserve_ai_request(request_id uuid, request_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare quota jsonb;
begin
  perform pg_advisory_xact_lock(94381042);
  quota := public.fitness_ai_quota();
  if (quota->>'dailyRemaining')::int<=0 or (quota->>'monthlyRemaining')::int<=0 then raise exception 'AI allowance exhausted'; end if;
  insert into public.ai_usage(id,user_id,kind) values(request_id,auth.uid(),request_kind);
  return public.fitness_ai_quota();
end $$;
revoke all on function public.fitness_ai_quota() from public,anon;
revoke all on function public.fitness_reserve_ai_request(uuid,text) from public,anon;
grant execute on function public.fitness_ai_quota() to authenticated;
grant execute on function public.fitness_reserve_ai_request(uuid,text) to authenticated;
