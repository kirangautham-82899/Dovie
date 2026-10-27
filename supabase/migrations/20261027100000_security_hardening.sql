-- Security hardening. Nothing here changes what a signed-in person can do with
-- their own data; it narrows everything else.
--
-- 1. Policies apply to the authenticated role only, and call auth.uid() once
--    per query instead of once per row.
-- 2. When someone has turned on two-step verification, their rows need a
--    session that passed it (aal2). A stolen password alone reads nothing.
-- 3. The anon role loses table and function access it never needed.
-- 4. Every function gets a fixed search_path.
-- 5. Goal milestones, goal logs and fitness sessions can only point at the
--    owner's own goals and workout logs.
-- 6. AI insight calls are rate-limited per user in the database, so the
--    limit holds across every server instance.
--
-- Safe to run again: each step skips or replaces what already exists.

-- ---------- 0. two-step check, kept out of the exposed API ----------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- True when the session is strong enough for this user: aal2 once they have a
-- verified factor, aal1 otherwise. Security definer so policies never need
-- direct access to auth.mfa_factors.
create or replace function private.mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors f
      where f.user_id = auth.uid() and f.status = 'verified'
    );
$$;
revoke execute on function private.mfa_ok() from public, anon;
grant execute on function private.mfa_ok() to authenticated;

-- ---------- 0. a table for the per-user AI rate limit (see 6) ----------
create table if not exists public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_requests_user_time_idx on public.ai_requests (user_id, created_at);

alter table public.ai_requests enable row level security;
-- Readable by the owner; written only through claim_ai_request, so nobody can
-- delete their own rows to reset the limit.
drop policy if exists "ai_requests_select_own" on public.ai_requests;
create policy "ai_requests_select_own" on public.ai_requests for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.ai_requests from anon;
revoke insert, update, delete on public.ai_requests from authenticated;

-- ---------- 1. tighten existing policies ----------
do $$
declare
  p record;
  q text;
  c text;
begin
  for p in select * from pg_policies where schemaname = 'public' loop
    execute format('alter policy %I on public.%I to authenticated', p.policyname, p.tablename);

    if p.qual is not null and p.qual not like '%SELECT auth.uid()%' then
      q := replace(p.qual, 'auth.uid()', '(select auth.uid())');
      if q <> p.qual then
        execute format('alter policy %I on public.%I using (%s)', p.policyname, p.tablename, q);
      end if;
    end if;

    if p.with_check is not null and p.with_check not like '%SELECT auth.uid()%' then
      c := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
      if c <> p.with_check then
        execute format('alter policy %I on public.%I with check (%s)', p.policyname, p.tablename, c);
      end if;
    end if;
  end loop;
end $$;

-- ---------- 2. two-step verification guards every table ----------
-- Restrictive, so it is ANDed with the ownership policies above. People
-- without a verified factor are unaffected (aal1 is enough for them).
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and rowsecurity loop
    execute format('drop policy if exists "require_mfa_when_enrolled" on public.%I', t.tablename);
    execute format(
      'create policy "require_mfa_when_enrolled" on public.%I as restrictive for all to authenticated using ((select private.mfa_ok()))',
      t.tablename
    );
  end loop;
end $$;

-- ---------- 3. nothing for anonymous visitors ----------
-- RLS already returned no rows to anon; now anon can't even reach the tables.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- The same for anything created later.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------- 4. fixed search_path on every function ----------
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.sig);
  end loop;
end $$;

-- ---------- 5. child rows must point at the owner's own parents ----------
create or replace function public.enforce_goal_child_owner() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.goals g where g.id = new.goal_id and g.user_id = new.user_id) then
    raise exception 'goal does not belong to the user' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists goal_milestones_owner on public.goal_milestones;
create trigger goal_milestones_owner
  before insert or update of goal_id, user_id on public.goal_milestones
  for each row execute function public.enforce_goal_child_owner();

drop trigger if exists goal_logs_owner on public.goal_logs;
create trigger goal_logs_owner
  before insert or update of goal_id, user_id on public.goal_logs
  for each row execute function public.enforce_goal_child_owner();

create or replace function public.enforce_session_log_owner() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.workout_log_id is not null
     and not exists (select 1 from public.workout_logs w where w.id = new.workout_log_id and w.user_id = new.user_id) then
    raise exception 'workout log does not belong to the user' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists fitness_sessions_log_owner on public.fitness_sessions;
create trigger fitness_sessions_log_owner
  before insert or update of workout_log_id, user_id on public.fitness_sessions
  for each row execute function public.enforce_session_log_owner();

revoke execute on function public.enforce_goal_child_owner() from public, anon, authenticated;
revoke execute on function public.enforce_session_log_owner() from public, anon, authenticated;

-- ---------- 6. per-user AI rate limit ----------
-- Records one AI call for the caller and says whether it is within the limit.
create or replace function public.claim_ai_request(p_limit integer, p_window_minutes integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  used integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_limit not between 1 and 1000 or p_window_minutes not between 1 and 1440 then
    raise exception 'bad limit' using errcode = '22023';
  end if;

  -- One caller at a time per user, so parallel requests can't slip past the count.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  delete from public.ai_requests where user_id = uid and created_at < now() - interval '1 day';
  select count(*) into used
  from public.ai_requests
  where user_id = uid and created_at > now() - make_interval(mins => p_window_minutes);
  if used >= p_limit then
    return false;
  end if;
  insert into public.ai_requests (user_id) values (uid);
  return true;
end $$;

revoke execute on function public.claim_ai_request(integer, integer) from public, anon;
grant execute on function public.claim_ai_request(integer, integer) to authenticated;
