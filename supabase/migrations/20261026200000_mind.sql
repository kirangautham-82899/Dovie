-- Wellness: a private daily mental-health check-in. Entered by hand, belongs to
-- one account (row-level security), never used for insights, and is cleared with
-- "clear my data".

create table public.mind_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  stress smallint check (stress between 1 and 5),
  feelings text[] not null default '{}' check (cardinality(feelings) <= 12),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mind_logs_not_empty check (stress is not null or cardinality(feelings) > 0 or note is not null)
);
create unique index mind_logs_one_per_day on public.mind_logs (user_id, log_date);

alter table public.mind_logs enable row level security;
create trigger set_updated_at before update on public.mind_logs
  for each row execute function public.set_updated_at();
create policy "mind_logs_select_own" on public.mind_logs for select using (user_id = auth.uid());
create policy "mind_logs_insert_own" on public.mind_logs for insert with check (user_id = auth.uid());
create policy "mind_logs_update_own" on public.mind_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mind_logs_delete_own" on public.mind_logs for delete using (user_id = auth.uid());

-- Clearing your data now clears these too.
create or replace function public.clear_my_data() returns void
language plpgsql security invoker set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.fitness_sessions where user_id = uid;
  delete from public.daily_activity where user_id = uid;
  delete from public.body_logs where user_id = uid;
  delete from public.habit_logs where user_id = uid;
  delete from public.workout_logs where user_id = uid;
  delete from public.habits where user_id = uid;
  delete from public.goals where user_id = uid;
  delete from public.tasks where user_id = uid;
  delete from public.checkins where user_id = uid;
  delete from public.focus_sessions where user_id = uid;
  delete from public.incomes where user_id = uid;
  delete from public.expenses where user_id = uid;
  delete from public.bills where user_id = uid;
  delete from public.budgets where user_id = uid;
  delete from public.savings_goals where user_id = uid;
  delete from public.journal_entries where user_id = uid;
  delete from public.journal_keys where user_id = uid;
  delete from public.time_blocks where user_id = uid;
  delete from public.period_logs where user_id = uid;
  delete from public.meals where user_id = uid;
  delete from public.mind_logs where user_id = uid;
  update public.profiles
  set onboarded_at = null, starter_template = null, interests = null
  where id = uid;
end $$;
