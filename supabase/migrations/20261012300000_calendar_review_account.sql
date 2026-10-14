-- Calendar time blocks, the weekly review and account controls.

-- ---------- time_blocks ----------
create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  block_date date not null,
  starts_at time not null,
  ends_at time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_blocks_order check (ends_at > starts_at)
);
create index time_blocks_user_date_idx on public.time_blocks (user_id, block_date);

alter table public.time_blocks enable row level security;
create trigger set_updated_at before update on public.time_blocks
  for each row execute function public.set_updated_at();
create policy "time_blocks_select_own" on public.time_blocks for select using (user_id = auth.uid());
create policy "time_blocks_insert_own" on public.time_blocks for insert with check (user_id = auth.uid());
create policy "time_blocks_update_own" on public.time_blocks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "time_blocks_delete_own" on public.time_blocks for delete using (user_id = auth.uid());

-- ---------- weekly review ----------
-- One row per day for the 7 days ending on p_end (the caller's local date).
-- Numbers and completion only; journal text never leaves the browser.
-- Note: unfinished tasks are carried forward, so a past day's "planned"
-- count reflects what was finished there plus what was left on it.
create or replace function public.weekly_review(p_end date)
returns table (
  day date,
  tasks_planned integer,
  tasks_done integer,
  habits_done integer,
  habits_total integer,
  mood smallint,
  energy smallint,
  sleep_hours numeric,
  water_glasses smallint,
  score smallint,
  focus_minutes integer,
  movement_minutes integer,
  journaled boolean
)
language plpgsql stable security invoker set search_path = public as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  tz text;
begin
  select timezone into tz from public.profiles where id = uid;
  tz := coalesce(tz, 'Asia/Kolkata');

  return query
  with days as (
    select (p_end - g)::date as d from generate_series(0, 6) g
  )
  select
    days.d,
    (select count(*)::integer from public.tasks t
      where t.user_id = uid and t.due_date = days.d and t.deleted_at is null),
    (select count(*)::integer from public.tasks t
      where t.user_id = uid and t.due_date = days.d and t.deleted_at is null and t.completed_at is not null),
    (select count(*)::integer from public.habit_logs l
      join public.habits h on h.id = l.habit_id
      where l.user_id = uid and l.log_date = days.d and h.deleted_at is null),
    (select count(*)::integer from public.habits h
      where h.user_id = uid and h.deleted_at is null and h.is_active
        and (h.created_at at time zone tz)::date <= days.d),
    c.mood,
    c.energy,
    c.sleep_hours,
    c.water_glasses,
    c.score,
    (select coalesce(sum(f.minutes), 0)::integer from public.focus_sessions f
      where f.user_id = uid and f.session_date = days.d),
    (select coalesce(sum(w.value), 0)::integer from public.workout_logs w
      where w.user_id = uid and w.log_date = days.d and w.goal_id is null),
    exists (select 1 from public.journal_entries j
      where j.user_id = uid and j.entry_date = days.d and j.deleted_at is null)
  from days
  left join public.checkins c on c.user_id = uid and c.checkin_date = days.d
  order by days.d;
end $$;

revoke execute on function public.weekly_review(date) from public, anon;
grant execute on function public.weekly_review(date) to authenticated;

-- ---------- clear my data ----------
-- Hard-deletes every Dovie record for the caller but keeps the account and
-- profile, and sends them back through onboarding.
create or replace function public.clear_my_data() returns void
language plpgsql security invoker set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
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

revoke execute on function public.clear_my_data() from public, anon;
grant execute on function public.clear_my_data() to authenticated;

-- ---------- delete my account ----------
-- Deleting the auth user cascades to every table above. Runs as the owner
-- because clients cannot touch auth.users, but only ever deletes the caller.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
