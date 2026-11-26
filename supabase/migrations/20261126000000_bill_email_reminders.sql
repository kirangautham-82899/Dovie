-- Email bill reminders: the day before a bill is due, one email lists what is
-- due tomorrow, even when Dovie is closed. Sent by the bill-reminders Edge
-- Function (supabase/functions/bill-reminders). Setup: docs/bill-reminders.md.
--
-- Off for everyone until they turn it on in Settings.
--
-- Safe to run again.

alter table public.profiles
  add column if not exists email_reminders_enabled boolean not null default false;

-- What has already been sent, so a bill is emailed once per due date. A
-- recurring bill gets a new due date when paid, so it is reminded again.
-- In the private schema: no browser ever reads or writes it.
create schema if not exists private;

create table if not exists private.bill_reminder_log (
  bill_id uuid not null references public.bills (id) on delete cascade,
  due_date date not null,
  sent_at timestamptz not null default now(),
  primary key (bill_id, due_date)
);
alter table private.bill_reminder_log enable row level security;

-- Marks every reminder that is due now as taken and returns it. "Due now" means
-- the bill falls due tomorrow in the owner's timezone and it is 9 am or later
-- there. Two runs at once can't both get the same row.
create or replace function public.claim_due_bill_reminders(p_limit integer default 200)
returns table (
  bill_id uuid,
  user_id uuid,
  email text,
  display_name text,
  title text,
  amount_paise bigint,
  due_date date
)
language sql security definer set search_path = '' as $$
  with due as (
    select b.id, b.user_id, u.email::text as email, p.display_name, b.title, b.amount_paise, b.due_date
    from public.bills b
    join public.profiles p on p.id = b.user_id
    join auth.users u on u.id = b.user_id
    -- A bad timezone value must not stop everyone else's reminders.
    cross join lateral (
      select now() at time zone coalesce(
        (select z.name from pg_catalog.pg_timezone_names z where z.name = p.timezone),
        'Asia/Kolkata'
      ) as local_now
    ) t
    where p.email_reminders_enabled
      and u.email is not null
      and u.email_confirmed_at is not null
      and b.deleted_at is null
      and b.paid_at is null
      and b.due_date = t.local_now::date + 1
      and extract(hour from t.local_now) >= 9
      and not exists (
        select 1 from private.bill_reminder_log l where l.bill_id = b.id and l.due_date = b.due_date
      )
    order by b.user_id, b.title
    limit greatest(1, least(p_limit, 1000))
  ),
  claimed as (
    insert into private.bill_reminder_log (bill_id, due_date)
    select d.id, d.due_date from due d
    on conflict do nothing
    returning bill_reminder_log.bill_id
  )
  select d.id, d.user_id, d.email, d.display_name, d.title, d.amount_paise, d.due_date
  from due d
  join claimed c on c.bill_id = d.id;
$$;

-- Gives claims back when an email could not be sent, so the next run retries.
create or replace function public.release_bill_reminders(p_bills uuid[], p_due date)
returns void
language sql security definer set search_path = '' as $$
  delete from private.bill_reminder_log where bill_id = any (p_bills) and due_date = p_due;
$$;

-- These read other people's email addresses: the sender only.
revoke execute on function public.claim_due_bill_reminders(integer) from public, anon, authenticated;
revoke execute on function public.release_bill_reminders(uuid[], date) from public, anon, authenticated;
grant execute on function public.claim_due_bill_reminders(integer) to service_role;
grant execute on function public.release_bill_reminders(uuid[], date) to service_role;
