-- Goals, grown up: a reason, a date, a step size, a pin, milestones and a
-- dated log of every step so the app can show pace, streaks and history.

-- ---------- goals: new columns ----------
alter table public.goals
  add column why text,
  add column target_date date,
  add column step numeric not null default 1,
  add column pinned boolean not null default false,
  add column completed_at timestamptz,
  add constraint goals_why_len check (why is null or char_length(btrim(why)) between 1 and 200),
  add constraint goals_step_range check (step > 0 and step <= 1000000000);

-- ---------- goal_milestones ----------
create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goal_milestones_goal_idx on public.goal_milestones (goal_id);

alter table public.goal_milestones enable row level security;
create trigger set_updated_at before update on public.goal_milestones
  for each row execute function public.set_updated_at();

create policy "goal_milestones_select_own" on public.goal_milestones for select using (user_id = auth.uid());
create policy "goal_milestones_insert_own" on public.goal_milestones for insert with check (
  user_id = auth.uid() and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
);
create policy "goal_milestones_update_own" on public.goal_milestones for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goal_milestones_delete_own" on public.goal_milestones for delete using (user_id = auth.uid());

-- ---------- goal_logs: one row per step taken ----------
create table public.goal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  amount numeric not null check (amount <> 0 and amount between -1000000000 and 1000000000),
  note text check (note is null or char_length(btrim(note)) between 1 and 140),
  log_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index goal_logs_user_date_idx on public.goal_logs (user_id, log_date);
create index goal_logs_goal_idx on public.goal_logs (goal_id);

alter table public.goal_logs enable row level security;

create policy "goal_logs_select_own" on public.goal_logs for select using (user_id = auth.uid());
create policy "goal_logs_insert_own" on public.goal_logs for insert with check (
  user_id = auth.uid() and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
);
create policy "goal_logs_delete_own" on public.goal_logs for delete using (user_id = auth.uid());
-- The app writes logs through log_goal_progress so the running total and the log never disagree.

-- Adds a step to a general goal, records it, and marks the goal done (or not) by its target.
create or replace function public.log_goal_progress(p_goal uuid, p_amount numeric, p_note text, p_date date)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.goals
  set current_value = greatest(0, current_value + p_amount)
  where id = p_goal and user_id = auth.uid() and kind = 'general' and deleted_at is null;
  if not found then
    raise exception 'Goal not found';
  end if;

  insert into public.goal_logs (goal_id, amount, note, log_date)
  values (p_goal, p_amount, nullif(btrim(coalesce(p_note, '')), ''), coalesce(p_date, current_date));

  update public.goals
  set completed_at = case
    when target_value is not null and current_value >= target_value then coalesce(completed_at, now())
    else null
  end
  where id = p_goal;
end;
$$;

revoke execute on function public.log_goal_progress(uuid, numeric, text, date) from public, anon;
grant execute on function public.log_goal_progress(uuid, numeric, text, date) to authenticated;

-- Removes a logged step and takes it back off the goal's total.
create or replace function public.delete_goal_log(p_log uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare
  g uuid;
  a numeric;
begin
  delete from public.goal_logs where id = p_log and user_id = auth.uid() returning goal_id, amount into g, a;
  if g is null then
    return;
  end if;
  update public.goals
  set current_value = greatest(0, current_value - a),
      completed_at = case
        when target_value is not null and greatest(0, current_value - a) >= target_value then completed_at
        else null
      end
  where id = g and user_id = auth.uid();
end;
$$;

revoke execute on function public.delete_goal_log(uuid) from public, anon;
grant execute on function public.delete_goal_log(uuid) to authenticated;
