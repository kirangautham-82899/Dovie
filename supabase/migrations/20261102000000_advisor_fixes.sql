-- Fixes from the Supabase advisors. Nothing here changes what anyone can do
-- with their own data.
--
-- 1. Trigger functions run as security definer, so nobody should be able to
--    call them directly through /rest/v1/rpc. Triggers still fire: the
--    EXECUTE privilege is only checked when the trigger is created.
-- 2. Foreign keys get covering indexes, so owner deletes and joins don't scan.
--
-- Safe to run again.

-- ---------- 1. trigger functions out of the API ----------
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- rls_auto_enable is the dashboard's event trigger helper; it may not exist
-- on every project.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- ---------- 2. covering indexes for foreign keys ----------
create index if not exists goals_user_idx on public.goals (user_id);
create index if not exists habits_user_idx on public.habits (user_id);
create index if not exists savings_goals_user_idx on public.savings_goals (user_id);
create index if not exists goal_milestones_user_idx on public.goal_milestones (user_id);
create index if not exists workout_logs_goal_idx on public.workout_logs (goal_id);
create index if not exists fitness_sessions_workout_log_idx on public.fitness_sessions (workout_log_id);
