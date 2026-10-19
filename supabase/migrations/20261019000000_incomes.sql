-- Money in: what the user earned (salary, freelance, gifts...). Entered by
-- hand like expenses, never pulled from a bank. Amounts are integer paise.

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0 and amount_paise <= 100000000000),
  source text not null default 'Salary' check (char_length(btrim(source)) between 1 and 30),
  note text check (note is null or char_length(note) <= 120),
  received_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index incomes_user_date_idx on public.incomes (user_id, received_on);

alter table public.incomes enable row level security;
create trigger set_updated_at before update on public.incomes
  for each row execute function public.set_updated_at();
create policy "incomes_select_own" on public.incomes for select using (user_id = auth.uid());
create policy "incomes_insert_own" on public.incomes for insert with check (user_id = auth.uid());
create policy "incomes_update_own" on public.incomes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "incomes_delete_own" on public.incomes for delete using (user_id = auth.uid());

-- Clearing your data now clears income too.
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
  delete from public.incomes where user_id = uid;
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
