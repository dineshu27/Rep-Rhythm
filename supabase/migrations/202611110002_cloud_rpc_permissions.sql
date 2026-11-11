-- Supabase grants may include explicit anon EXECUTE defaults, independently of PUBLIC.
-- Preserve the intended signed-in-only boundary for the existing manual account RPCs.
begin;
revoke all on function public.fitness_id(uuid,text),public.fitness_save(jsonb,bigint),public.fitness_load(),public.fitness_session(public.workout_logs),public.fitness_delete_account() from public,anon,authenticated;
grant execute on function public.fitness_id(uuid,text),public.fitness_save(jsonb,bigint),public.fitness_load(),public.fitness_session(public.workout_logs),public.fitness_delete_account() to authenticated;
commit;
