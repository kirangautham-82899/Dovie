# Email bill reminders

The day before a bill is due, Dovie emails its owner after 9 am in their timezone, even when the app is
closed. It is off for each person until they turn it on in **Settings**.

How it works: `pg_cron` calls the `bill-reminders` Edge Function every hour. The function asks the database
for reminders that are due (`claim_due_bill_reminders`), sends one email per person through Resend, and gives
a reminder back if sending fails so the next run retries it. Each bill is emailed once per due date. The
service-role key stays inside Supabase; Vercel never needs it.

Do the steps in order. Test on a separate test project first if you have one.

## 1. Resend

1. Create a Resend account and **verify your own domain** (DNS records). Without a verified domain Resend
   only delivers to your own address.
2. Create an API key with sending access.

## 2. Database

Run `supabase/migrations/20261126000000_bill_email_reminders.sql` in **SQL Editor > New query**.

## 3. Edge Function

Make a long random value for `CRON_SECRET` (for example from a password manager). From the repository root:

```bash
npx supabase login
```

```bash
npx supabase secrets set --project-ref <project-ref> CRON_SECRET=<random-value> RESEND_API_KEY=<resend-key> REMINDER_FROM="Dovie <reminders@your-domain>" SITE_URL=https://your-domain
```

```bash
npx supabase functions deploy bill-reminders --no-verify-jwt --project-ref <project-ref>
```

`--no-verify-jwt` is needed because the caller is the database, not a signed-in person. Requests without the
right `CRON_SECRET` get a 404.

## 4. Schedule

In **Database > Extensions**, turn on `pg_cron` and `pg_net`. Then, in the SQL Editor, store the two values in
Vault (so the secret isn't written into the job) and schedule the call:

```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/bill-reminders', 'bill_reminders_url');
select vault.create_secret('<random-value>', 'bill_reminders_secret');

select cron.schedule(
  'bill-reminders-hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'bill_reminders_url'),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'bill_reminders_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
```

## 5. Show the setting

Add `NEXT_PUBLIC_EMAIL_REMINDERS=1` in Vercel and redeploy. **Settings > Notifications** now has an
**Email me the day before a bill is due** switch.

## 6. Check it

1. Turn the switch on, and add a bill due tomorrow.
2. After 9 am your time, either wait for the next run (5 past the hour) or run the `select net.http_post(...)`
   statement above by hand.
3. With Dovie closed, the email arrives. `{"sent":1,"failed":0}` shows in `net._http_response`, and the
   function's logs show any Resend error status.

To stop sending: `select cron.unschedule('bill-reminders-hourly');`

## Not built yet

Web push notifications. They need a service worker push handler, VAPID keys and a subscriptions table.
