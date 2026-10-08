-- Dovie foundation schema. All user data is protected by row-level security.

create extension if not exists "pgcrypto";

-- Shared trigger: keep updated_at fresh (needed for future offline sync).
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Kolkata',
  focus_areas text[] not null default '{}',
  is_adult_confirmed boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, is_adult_confirmed)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    coalesce((new.raw_user_meta_data ->> 'is_adult_confirmed')::boolean, false)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- goals ----------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('fitness', 'general')),
  title text not null,
  target_value numeric,
  unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- tasks ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  due_date date not null default current_date,
  is_priority boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index tasks_user_due_idx on public.tasks (user_id, due_date);

-- ---------- habits ----------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  log_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

-- ---------- workout_logs ----------
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  log_date date not null default current_date,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_logs_user_date_idx on public.workout_logs (user_id, log_date);

-- ---------- checkins ----------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  checkin_date date not null default current_date,
  score smallint check (score between 0 and 100),
  mood smallint check (mood between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

-- ---------- RLS + updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','goals','tasks','habits','habit_logs','workout_logs','checkins'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- profiles: the owner is the row id. Rows are created by the signup trigger.
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- every other table: the owner is user_id
do $$
declare t text;
begin
  foreach t in array array[
    'goals','tasks','habits','habit_logs','workout_logs','checkins'
  ] loop
    execute format('create policy "%1$s_select_own" on public.%1$I for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;
