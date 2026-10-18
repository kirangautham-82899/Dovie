-- Live fitness tracker: recorded workout sessions, all-day activity totals,
-- body weight and the personal targets the tracker measures against.

-- ---------- profiles: body and daily targets ----------
-- Weight drives the calorie estimate and height the stride length. Both are
-- optional; the tracker falls back to averages when they are missing.
alter table public.profiles
  add column weight_kg numeric(5, 1),
  add column height_cm numeric(5, 1),
  add column step_goal integer not null default 8000,
  add column active_goal_min integer not null default 30,
  add column move_goal_kcal integer not null default 400,
  add constraint profiles_weight_range check (weight_kg is null or weight_kg between 20 and 350),
  add constraint profiles_height_range check (height_cm is null or height_cm between 80 and 250),
  add constraint profiles_step_goal check (step_goal between 500 and 100000),
  add constraint profiles_active_goal check (active_goal_min between 5 and 600),
  add constraint profiles_move_goal check (move_goal_kcal between 50 and 5000);

-- ---------- fitness_sessions ----------
-- One recorded workout. duration_s is moving time (pauses excluded); route is
-- a simplified list of [lat, lng] points and splits a list of seconds per km.
create table public.fitness_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity text not null check (activity in (
    'walk', 'run', 'cycle', 'hike', 'strength', 'yoga', 'hiit', 'swim', 'sport', 'dance', 'other'
  )),
  session_date date not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_s integer not null check (duration_s between 1 and 86400),
  distance_m numeric(9, 1) not null default 0 check (distance_m between 0 and 1000000),
  steps integer not null default 0 check (steps between 0 and 500000),
  calories integer not null default 0 check (calories between 0 and 20000),
  avg_hr smallint check (avg_hr is null or avg_hr between 30 and 240),
  max_hr smallint check (max_hr is null or max_hr between 30 and 240),
  elevation_gain_m numeric(7, 1) check (elevation_gain_m is null or elevation_gain_m between 0 and 20000),
  effort smallint check (effort is null or effort between 1 and 5),
  route jsonb check (route is null or (jsonb_typeof(route) = 'array' and jsonb_array_length(route) <= 2000)),
  splits jsonb check (splits is null or (jsonb_typeof(splits) = 'array' and jsonb_array_length(splits) <= 500)),
  note text check (note is null or char_length(note) <= 200),
  workout_log_id uuid references public.workout_logs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fitness_sessions_order check (ended_at >= started_at)
);
create index fitness_sessions_user_date_idx on public.fitness_sessions (user_id, session_date);

-- A session also counts as movement minutes, so Today, Wellness and the weekly
-- review see it without knowing about the tracker.
create or replace function public.fitness_session_movement() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  log_id uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.workout_logs (user_id, log_date, activity, value)
    values (new.user_id, new.session_date, initcap(new.activity), greatest(1, ceil(new.duration_s / 60.0)))
    returning id into log_id;
    new.workout_log_id := log_id;
    return new;
  end if;
  -- DELETE
  if old.workout_log_id is not null then
    delete from public.workout_logs where id = old.workout_log_id and user_id = old.user_id;
  end if;
  return old;
end $$;

create trigger fitness_sessions_movement_ins
  before insert on public.fitness_sessions
  for each row execute function public.fitness_session_movement();
create trigger fitness_sessions_movement_del
  after delete on public.fitness_sessions
  for each row execute function public.fitness_session_movement();

-- ---------- daily_activity ----------
-- All-day totals from the step counter, outside of recorded workouts.
create table public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_date date not null,
  steps integer not null default 0 check (steps between 0 and 500000),
  distance_m numeric(9, 1) not null default 0 check (distance_m between 0 and 1000000),
  active_seconds integer not null default 0 check (active_seconds between 0 and 86400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

-- Adds counted steps to a day atomically (the browser flushes small batches).
create or replace function public.add_daily_activity(
  p_date date, p_steps integer, p_distance_m numeric, p_active_seconds integer
) returns void
language sql security invoker set search_path = public as $$
  insert into public.daily_activity (user_id, activity_date, steps, distance_m, active_seconds)
  values (
    auth.uid(), p_date,
    least(greatest(p_steps, 0), 500000),
    least(greatest(p_distance_m, 0), 1000000),
    least(greatest(p_active_seconds, 0), 86400)
  )
  on conflict (user_id, activity_date) do update set
    steps = least(public.daily_activity.steps + excluded.steps, 500000),
    distance_m = least(public.daily_activity.distance_m + excluded.distance_m, 1000000),
    active_seconds = least(public.daily_activity.active_seconds + excluded.active_seconds, 86400);
$$;

revoke execute on function public.add_daily_activity(date, integer, numeric, integer) from public, anon;
grant execute on function public.add_daily_activity(date, integer, numeric, integer) to authenticated;

-- ---------- body_logs ----------
create table public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null,
  weight_kg numeric(5, 1) not null check (weight_kg between 20 and 350),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ---------- RLS + updated_at ----------
do $$
declare t text;
begin
  foreach t in array array['fitness_sessions', 'daily_activity', 'body_logs'] loop
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

-- ---------- clear my data: include the tracker ----------
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
  delete from public.expenses where user_id = uid;
  delete from public.bills where user_id = uid;
  delete from public.budgets where user_id = uid;
  delete from public.savings_goals where user_id = uid;
  delete from public.journal_entries where user_id = uid;
  delete from public.journal_keys where user_id = uid;
  delete from public.time_blocks where user_id = uid;
  update public.profiles
  set onboarded_at = null, starter_template = null, interests = null
  where id = uid;
end $$;
