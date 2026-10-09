-- Goals and habits: validation, integrity rules and streak calculation.

-- ---------- validation ----------
alter table public.habits
  add constraint habits_title_len check (char_length(btrim(title)) between 1 and 100);

alter table public.goals
  add constraint goals_title_len check (char_length(btrim(title)) between 1 and 100),
  add constraint goals_unit_len check (unit is null or char_length(btrim(unit)) between 1 and 20),
  add constraint goals_target_positive check (target_value is null or target_value > 0),
  -- A fitness goal is a daily target, so it needs an amount and a unit.
  add constraint goals_fitness_needs_target
    check (kind <> 'fitness' or (target_value is not null and unit is not null));

alter table public.workout_logs
  add constraint workout_value_range check (value is null or (value > 0 and value <= 100000)),
  add constraint workout_note_len check (note is null or char_length(note) <= 200);

-- ---------- integrity: logs must belong to the user and not be in the future ----------
-- RLS only checks user_id, so without this a user could attach a log to someone
-- else's habit or goal id. Runs as the caller, so RLS hides other users' rows.
create or replace function public.enforce_log_rules() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  tz text;
  local_today date;
begin
  select timezone into tz from public.profiles where id = new.user_id;
  local_today := (now() at time zone coalesce(tz, 'Asia/Kolkata'))::date;

  if new.log_date > local_today then
    raise exception 'log_date cannot be in the future' using errcode = '23514';
  end if;

  if tg_table_name = 'habit_logs' then
    if not exists (select 1 from public.habits h where h.id = new.habit_id and h.user_id = new.user_id) then
      raise exception 'habit does not belong to the user' using errcode = '42501';
    end if;
  elsif tg_table_name = 'workout_logs' and new.goal_id is not null then
    if not exists (select 1 from public.goals g where g.id = new.goal_id and g.user_id = new.user_id) then
      raise exception 'goal does not belong to the user' using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

create trigger habit_logs_rules
  before insert or update on public.habit_logs
  for each row execute function public.enforce_log_rules();

create trigger workout_logs_rules
  before insert or update on public.workout_logs
  for each row execute function public.enforce_log_rules();

create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, habit_id, log_date);

-- ---------- streaks ----------
-- One row per active habit. A streak is a run of consecutive days with a log.
-- The current streak is still alive if the last log was today or yesterday, so
-- it does not drop to zero before the user has had a chance to log today.
-- p_today is the caller's local date, sent by the client.
create or replace function public.habit_stats(p_today date)
returns table (
  habit_uuid uuid,
  streak integer,
  best integer,
  done_today boolean,
  recent_dates date[]
)
language sql stable security invoker set search_path = public as $$
  with mine as (
    select h.id
    from public.habits h
    where h.user_id = auth.uid() and h.deleted_at is null and h.is_active
  ),
  logs as (
    select l.habit_id, l.log_date,
           l.log_date - (row_number() over (partition by l.habit_id order by l.log_date))::integer as grp
    from public.habit_logs l
    join mine m on m.id = l.habit_id
    where l.user_id = auth.uid() and l.log_date <= p_today
  ),
  islands as (
    select habit_id, max(log_date) as end_date, count(*)::integer as len
    from logs
    group by habit_id, grp
  )
  select
    m.id,
    coalesce((select i.len from islands i where i.habit_id = m.id and i.end_date >= p_today - 1 limit 1), 0),
    coalesce((select max(i.len) from islands i where i.habit_id = m.id), 0),
    exists (
      select 1 from public.habit_logs l
      where l.habit_id = m.id and l.user_id = auth.uid() and l.log_date = p_today
    ),
    coalesce((
      select array_agg(l.log_date order by l.log_date)
      from public.habit_logs l
      where l.habit_id = m.id and l.user_id = auth.uid()
        and l.log_date between p_today - 6 and p_today
    ), '{}'::date[])
  from mine m;
$$;

revoke execute on function public.habit_stats(date) from public, anon;
grant execute on function public.habit_stats(date) to authenticated;
