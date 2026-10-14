-- Nightly check-in and daily score.
--
-- Score = weighted average of four categories, each a 0..1 completion ratio:
--   priorities 40, other tasks 20, habits 25, fitness goals 15.
-- A category with nothing planned that day is dropped and the rest are
-- rescaled, so nobody is penalised for not using a feature. If nothing was
-- planned at all, the score is null.

alter table public.checkins
  add constraint checkins_note_len check (note is null or char_length(note) <= 500);

-- ---------- per-category breakdown for a day ----------
-- done/total are completion counts; fitness uses capped progress per goal
-- (15 of a 30 min goal counts as 0.5). All dates are the caller's local dates.
create or replace function public.score_breakdown(p_date date)
returns table (category text, done numeric, total numeric, weight integer)
language plpgsql stable security invoker set search_path = public as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  tz text;
begin
  select timezone into tz from public.profiles where id = uid;
  tz := coalesce(tz, 'Asia/Kolkata');

  return query
  select 'priorities'::text,
         count(*) filter (where t.completed_at is not null)::numeric,
         count(*)::numeric,
         40
  from public.tasks t
  where t.user_id = uid and t.due_date = p_date and t.is_priority and t.deleted_at is null

  union all
  select 'tasks'::text,
         count(*) filter (where t.completed_at is not null)::numeric,
         count(*)::numeric,
         20
  from public.tasks t
  where t.user_id = uid and t.due_date = p_date and not t.is_priority and t.deleted_at is null

  union all
  select 'habits'::text,
         (select count(*)
          from public.habit_logs l
          join public.habits h on h.id = l.habit_id
          where l.user_id = uid and l.log_date = p_date
            and h.deleted_at is null and h.is_active
            and (h.created_at at time zone tz)::date <= p_date)::numeric,
         (select count(*)
          from public.habits h
          where h.user_id = uid and h.deleted_at is null and h.is_active
            and (h.created_at at time zone tz)::date <= p_date)::numeric,
         25

  union all
  select 'fitness'::text,
         coalesce(sum(least(1, coalesce(w.amount, 0) / g.target_value)), 0)::numeric,
         count(*)::numeric,
         15
  from public.goals g
  left join (
    select goal_id, sum(value) as amount
    from public.workout_logs
    where user_id = uid and log_date = p_date
    group by goal_id
  ) w on w.goal_id = g.id
  where g.user_id = uid and g.kind = 'fitness' and g.deleted_at is null and g.is_active
    and (g.created_at at time zone tz)::date <= p_date;
end $$;

-- ---------- the score ----------
create or replace function public.daily_score(p_date date) returns smallint
language sql stable security invoker set search_path = public as $$
  select case
    when coalesce(sum(b.weight) filter (where b.total > 0), 0) = 0 then null
    else round(
      100 * sum(b.weight * b.done / b.total) filter (where b.total > 0)
          / sum(b.weight) filter (where b.total > 0)
    )::smallint
  end
  from public.score_breakdown(p_date) b;
$$;

revoke execute on function public.score_breakdown(date) from public, anon;
revoke execute on function public.daily_score(date) from public, anon;
grant execute on function public.score_breakdown(date) to authenticated;
grant execute on function public.daily_score(date) to authenticated;

-- ---------- the score cannot be set from the client ----------
-- Insert: only for the user's local today; the score is computed here.
-- Update: mood and note can change. While the day is still "today" the score
-- is recomputed (so finishing more tasks and re-checking-in raises it); after
-- that it is frozen, because carry-over moves unfinished tasks to the next day
-- and would otherwise inflate old scores.
create or replace function public.checkin_before_write() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  tz text;
  local_today date;
begin
  select timezone into tz from public.profiles where id = new.user_id;
  local_today := (now() at time zone coalesce(tz, 'Asia/Kolkata'))::date;

  if tg_op = 'INSERT' then
    if new.checkin_date <> local_today then
      raise exception 'check-in is only possible for today' using errcode = '23514';
    end if;
    new.score := public.daily_score(new.checkin_date);
  else
    new.user_id := old.user_id;
    new.checkin_date := old.checkin_date;
    if old.checkin_date = local_today then
      new.score := public.daily_score(new.checkin_date);
    else
      new.score := old.score;
    end if;
  end if;
  return new;
end $$;

create trigger checkins_before_write
  before insert or update on public.checkins
  for each row execute function public.checkin_before_write();
