-- Profile preferences, wellness fields on the daily check-in, goal progress,
-- the movement log and focus sessions.

-- ---------- profiles: preferences set in onboarding and settings ----------
alter table public.profiles
  add column interests text,
  add column starter_template text,
  add column reminders_enabled boolean not null default true,
  add column theme text not null default 'light',
  add column consented_at timestamptz,
  add constraint profiles_name_len check (display_name is null or char_length(display_name) <= 60),
  add constraint profiles_interests_len check (interests is null or char_length(interests) <= 200),
  add constraint profiles_template check (starter_template is null or starter_template in ('student', 'gym', 'office')),
  add constraint profiles_theme check (theme in ('light', 'dark'));

-- ---------- checkins: sleep, water and energy live on the same daily row ----------
-- A row can now exist before the evening check-in (logged from Wellness), so
-- "checked in" means mood is set, not that the row exists.
alter table public.checkins
  add column energy smallint check (energy between 1 and 5),
  add column water_glasses smallint not null default 0 check (water_glasses between 0 and 40),
  add column sleep_hours numeric(3, 1) check (sleep_hours between 0 and 24);

-- ---------- goals: general goals track progress toward a target ----------
alter table public.goals
  add column current_value numeric not null default 0,
  add column area text,
  add constraint goals_current_range check (current_value >= 0 and current_value <= 1000000000),
  add constraint goals_area check (area is null or area in ('health', 'money', 'balance', 'growth'));

-- Adds to a general goal's progress atomically. Never goes below zero.
create or replace function public.add_goal_progress(p_goal uuid, p_amount numeric) returns void
language sql security invoker set search_path = public as $$
  update public.goals
  set current_value = greatest(0, current_value + p_amount)
  where id = p_goal and user_id = auth.uid() and kind = 'general' and deleted_at is null;
$$;

revoke execute on function public.add_goal_progress(uuid, numeric) from public, anon;
grant execute on function public.add_goal_progress(uuid, numeric) to authenticated;

-- ---------- workout_logs: free-form movement ("Walk, 20 min") ----------
-- A log with a goal_id counts toward that fitness goal; a log without one is
-- a movement entry where value is minutes and activity describes it.
alter table public.workout_logs
  add column activity text,
  add constraint workout_activity_len check (activity is null or char_length(btrim(activity)) between 1 and 80);

-- ---------- focus_sessions ----------
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_date date not null default current_date,
  minutes smallint not null check (minutes between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index focus_sessions_user_date_idx on public.focus_sessions (user_id, session_date);

alter table public.focus_sessions enable row level security;
create trigger set_updated_at before update on public.focus_sessions
  for each row execute function public.set_updated_at();

create policy "focus_sessions_select_own" on public.focus_sessions for select using (user_id = auth.uid());
create policy "focus_sessions_insert_own" on public.focus_sessions for insert with check (user_id = auth.uid());
create policy "focus_sessions_update_own" on public.focus_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "focus_sessions_delete_own" on public.focus_sessions for delete using (user_id = auth.uid());
