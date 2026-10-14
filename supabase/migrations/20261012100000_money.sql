-- Money: expenses, bills, budgets and savings goals.
-- Amounts are integer paise (1 rupee = 100 paise), never floats.
-- Dovie never connects to a bank; everything here is entered by the user.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0 and amount_paise <= 100000000000),
  category text not null default 'Everyday' check (char_length(btrim(category)) between 1 and 30),
  note text check (note is null or char_length(note) <= 120),
  spent_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index expenses_user_date_idx on public.expenses (user_id, spent_on);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  amount_paise bigint check (amount_paise is null or (amount_paise >= 0 and amount_paise <= 100000000000)),
  due_date date not null,
  recurrence text not null default 'monthly' check (recurrence in ('once', 'weekly', 'monthly', 'yearly')),
  -- Set when a one-off bill is paid. Recurring bills move due_date forward instead.
  paid_at timestamptz,
  last_paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index bills_user_due_idx on public.bills (user_id, due_date);

-- One standing monthly limit per category.
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (char_length(btrim(category)) between 1 and 30),
  monthly_limit_paise bigint not null check (monthly_limit_paise > 0 and monthly_limit_paise <= 100000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  target_paise bigint not null check (target_paise > 0 and target_paise <= 100000000000),
  saved_paise bigint not null default 0 check (saved_paise >= 0 and saved_paise <= 100000000000),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- RLS + updated_at ----------
do $$
declare t text;
begin
  foreach t in array array['expenses','bills','budgets','savings_goals'] loop
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

-- ---------- mark a bill paid ----------
-- One-off bills get paid_at. Recurring bills roll their due date forward by
-- one period (repeatedly, if the user is catching up on several missed ones
-- the next tap moves it again). Dates are the caller's local dates.
create or replace function public.mark_bill_paid(p_bill uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare
  tz text;
  local_today date;
begin
  select timezone into tz from public.profiles where id = auth.uid();
  local_today := (now() at time zone coalesce(tz, 'Asia/Kolkata'))::date;

  update public.bills
  set last_paid_on = local_today,
      paid_at = case when recurrence = 'once' then now() else null end,
      due_date = case recurrence
        when 'weekly' then due_date + 7
        when 'monthly' then (due_date + interval '1 month')::date
        when 'yearly' then (due_date + interval '1 year')::date
        else due_date
      end
  where id = p_bill and user_id = auth.uid() and deleted_at is null and paid_at is null;
end $$;

-- Adds to (or, with a negative amount, takes from) a savings goal atomically.
create or replace function public.add_savings(p_goal uuid, p_amount_paise bigint) returns void
language sql security invoker set search_path = public as $$
  update public.savings_goals
  set saved_paise = greatest(0, saved_paise + p_amount_paise)
  where id = p_goal and user_id = auth.uid() and deleted_at is null;
$$;

revoke execute on function public.mark_bill_paid(uuid) from public, anon;
revoke execute on function public.add_savings(uuid, bigint) from public, anon;
grant execute on function public.mark_bill_paid(uuid) to authenticated;
grant execute on function public.add_savings(uuid, bigint) to authenticated;
