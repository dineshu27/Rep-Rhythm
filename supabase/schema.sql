-- Run once in your Supabase project's SQL Editor.
create table if not exists public.fitness_dashboards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.fitness_dashboards enable row level security;
revoke all on public.fitness_dashboards from anon;
grant select, insert, update, delete on public.fitness_dashboards to authenticated;
create policy "Read own dashboard" on public.fitness_dashboards for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own dashboard" on public.fitness_dashboards for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own dashboard" on public.fitness_dashboards for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own dashboard" on public.fitness_dashboards for delete to authenticated using ((select auth.uid()) = user_id);
