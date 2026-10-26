-- Wellness: a period tracker and a food diary. Both are entered by hand, belong
-- to one account (row-level security) and are cleared with "clear my data".

-- ---------- period_logs ----------
-- One row per day that has bleeding (flow 1 light, 2 medium, 3 heavy) and/or
-- symptoms. Cycle length and the next-period estimate are worked out in the app.
create table public.period_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  flow smallint check (flow between 1 and 3),
  symptoms text[] not null default '{}' check (cardinality(symptoms) <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_logs_not_empty check (flow is not null or cardinality(symptoms) > 0)
);
create unique index period_logs_one_per_day on public.period_logs (user_id, log_date);

-- ---------- meals ----------
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  calories integer check (calories is null or calories between 0 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meals_user_date_idx on public.meals (user_id, meal_date);

do $$
declare t text;
begin
  foreach t in array array['period_logs', 'meals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

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
  update public.profiles
  set onboarded_at = null, starter_template = null, interests = null
  where id = uid;
end $$;
