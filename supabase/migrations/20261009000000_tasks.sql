-- Tasks: validation, the "top 3 priorities" rule and carry-over to the next day.

-- Title must be 1-200 characters after trimming.
alter table public.tasks
  add constraint tasks_title_len check (char_length(btrim(title)) between 1 and 200);

-- How many times a task has been carried over from an earlier day.
alter table public.tasks
  add column carry_count smallint not null default 0;

-- ---------- at most 3 priorities per user per day ----------
create or replace function public.enforce_priority_limit() returns trigger
language plpgsql as $$
declare
  priority_count integer;
begin
  if new.is_priority and new.deleted_at is null then
    -- Serialise concurrent changes for the same user and day.
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || new.due_date::text, 0));

    select count(*) into priority_count
    from public.tasks
    where user_id = new.user_id
      and due_date = new.due_date
      and is_priority
      and deleted_at is null
      and id <> new.id;

    if priority_count >= 3 then
      raise exception 'priority_limit: at most 3 priorities per day'
        using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger tasks_priority_limit
  before insert or update of is_priority, due_date, deleted_at on public.tasks
  for each row execute function public.enforce_priority_limit();

-- ---------- carry unfinished tasks over to today ----------
-- "Today" is the caller's local date (profiles.timezone). Overdue, unfinished,
-- non-deleted tasks move to today; their priority flag is cleared so a carried
-- task never pushes today past the 3-priority limit.
create or replace function public.carry_over_tasks() returns integer
language plpgsql security invoker set search_path = public as $$
declare
  tz text;
  local_today date;
  moved integer;
begin
  select timezone into tz from public.profiles where id = auth.uid();
  local_today := (now() at time zone coalesce(tz, 'Asia/Kolkata'))::date;

  update public.tasks
  set due_date = local_today,
      is_priority = false,
      carry_count = carry_count + 1
  where user_id = auth.uid()
    and completed_at is null
    and deleted_at is null
    and due_date < local_today;

  get diagnostics moved = row_count;
  return moved;
end $$;

revoke execute on function public.carry_over_tasks() from public, anon;
grant execute on function public.carry_over_tasks() to authenticated;
