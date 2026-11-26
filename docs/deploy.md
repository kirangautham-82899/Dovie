# Deploying Dovie (Vercel + Supabase)

Production runs the Next.js app in `apps/web` on Vercel, with Supabase for the database and sign-in.
Supabase project: `lvzbonyyvieaylwqwukv` (the one in `apps/web/.env`).

Following this page from top to bottom is enough to deploy Dovie from scratch. To redeploy the existing
project, check the migrations (step 1) and push to `main`.

## 1. Database migrations

Migrations live in `supabase/migrations` and run **in filename order**. On the live project, everything up to
`20261102000000_advisor_fixes.sql` counts as **applied**. `20261126000000_bill_email_reminders.sql` is **new**
and only needed for [email bill reminders](bill-reminders.md).

To see what a database really has, run this in **SQL Editor > New query**. It only reads, and every row
should say `true` before you deploy:

```sql
with
  t(name) as (select tablename from pg_tables where schemaname = 'public'),
  f(name) as (select proname from pg_proc where pronamespace = 'public'::regnamespace),
  c(name) as (select table_name || '.' || column_name from information_schema.columns where table_schema = 'public')
select migration, applied from (values
  ('20261008000000_foundation',              'profiles' in (select name from t)),
  ('20261009000000_tasks',                   'carry_over_tasks' in (select name from f)),
  ('20261010000000_goals_habits',            'habit_stats' in (select name from f)),
  ('20261011000000_checkins',                'daily_score' in (select name from f)),
  ('20261012000000_profile_wellness',        'profiles.theme' in (select name from c)),
  ('20261012100000_money',                   'bills' in (select name from t)),
  ('20261012200000_journal',                 'journal_entries' in (select name from t)),
  ('20261012300000_calendar_review_account', 'time_blocks' in (select name from t)),
  ('20261018000000_fitness_tracker',         'fitness_sessions' in (select name from t)),
  ('20261019000000_incomes',                 'incomes' in (select name from t)),
  ('20261026000000_journal_plain',           'journal_entries.body' in (select name from c)),
  ('20261026100000_cycle_diet',              'period_logs' in (select name from t)),
  ('20261026200000_mind',                    'mind_logs' in (select name from t)),
  ('20261027000000_goals_plus',              'goal_milestones' in (select name from t)),
  ('20261027100000_security_hardening',      'ai_requests' in (select name from t)),
  ('20261102000000_advisor_fixes',           to_regclass('public.goals_user_idx') is not null),
  ('20261126000000_bill_email_reminders (optional)', 'profiles.email_reminders_enabled' in (select name from c))
) as m(migration, applied);
```

To apply a missing one, paste the file's contents into a new query and press **Run**. It should finish with
"Success. No rows returned". On a new project, run them all in order.

> On the live project use the SQL Editor, not `supabase db push`: migrations were applied by hand, so the CLI's
> migration history may be empty and it would try to run them again. `db push` is fine on a new, empty project.

## 2. Supabase Auth

**Authentication > URL Configuration**

- **Site URL:** your production URL, e.g. `https://dovie.vercel.app` (or your custom domain).
- **Redirect URLs:** add
  - `https://<your-production-domain>/auth/callback`
  - `https://*-<your-vercel-team>.vercel.app/auth/callback` (preview deployments)
  - `http://localhost:3000/auth/callback` (local development)

**Google sign-in** (optional, but the button is on the sign-in and sign-up pages)

1. In Google Cloud Console, create an **OAuth client ID** of type *Web application*.
2. Under *Authorized redirect URIs*, add `https://<project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase, open **Authentication > Sign In / Providers > Google**, turn it on, and paste the client ID
   and secret.

**Email confirmation:** keep **Confirm email** on in production. The confirmation link returns people to
`/auth/callback`, which signs them in and sends them to onboarding.

## 3. Vercel project

1. Push the repo to GitHub, then in Vercel choose **Add New > Project** and import it.
2. **Root Directory:** `apps/web`. Vercel detects Next.js; keep the default build and install commands.
3. **Environment variables** (Production, Preview and Development). `NEXT_PUBLIC_*` values are built into the
   app, so **redeploy after changing one**.

   | Name | Needed | Value |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://<project-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | the publishable (anon) key from **Supabase > Project Settings > API Keys** |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | before inviting people | an inbox someone reads. The privacy, terms and data-request pages link to it. |
   | `NEXT_PUBLIC_SITE_URL` | with a custom domain | e.g. `https://dovie.app`, for canonical URLs, the sitemap and share cards. Without it, Vercel's production URL is used. |
   | `NEXT_PUBLIC_SENTRY_DSN` | before inviting people | turns on [error reports](#4-monitoring) |
   | `GEMINI_API_KEY` | optional | enables **Ask Dovie** with Google Gemini (aistudio.google.com). Asked first when set. Server-only. |
   | `GEMINI_MODEL` | optional | a Gemini model to try before the built-in `-latest` list |
   | `ANTHROPIC_API_KEY` | optional | enables **Ask Dovie** with Claude (console.anthropic.com), and takes over if Gemini fails. Server-only. |
   | `NEXT_PUBLIC_EMAIL_REMINDERS` | optional | `1`, only after [email bill reminders](bill-reminders.md) are set up |
   | `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` | optional | search engine meta-tag codes |

   Never prefix an AI key with `NEXT_PUBLIC_`. Do **not** add the Supabase service-role key; the web app never
   needs it. Account deletion runs through the `delete_my_account()` database function.
4. Deploy. Then put the production URL into Supabase's **Site URL** and **Redirect URLs** (step 2) if you
   haven't already.

The CLI alternative, from `apps/web`:

```bash
npx vercel link
```

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
```

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

```bash
npx vercel --prod
```

## 4. Monitoring

**Errors (Sentry).** Create a Sentry account and a **Next.js** project, copy its DSN into
`NEXT_PUBLIC_SENTRY_DSN` and redeploy. In the Sentry project, also turn on **Security & Privacy > Prevent
storing of IP addresses**. Reports cover the browser, server rendering, API routes, the error pages and Ask
Dovie. Before anything is sent, `src/lib/monitoring/scrub.ts` removes the user, request headers, cookies,
bodies, query strings and breadcrumbs, and blanks quoted text, emails, ids and long numbers in messages.

To send a test error: set `MONITORING_TEST=1` in Vercel, redeploy, sign in, and open
`/api/monitoring-test`. The page shows an error. In Sentry, the event should read
`Dovie monitoring test for [email] "[text]"`. Then remove `MONITORING_TEST`.

**Analytics.** In Vercel, open the project's **Analytics** tab and press **Enable**. Vercel Web Analytics uses
no cookies; Dovie strips query strings from page addresses before they are counted. It only loads on Vercel.

## 5. Smoke test production

1. Open the site: the landing page loads at `/`.
2. **Join Dovie** with email (or Google), then finish onboarding.
3. On Today, add a plan, star it, tick a habit, log water, and do the evening check-in.
4. In Journal, write a page, save it, reload, and check it is still there.
5. In Money, add an expense and a bill and mark the bill paid; check the month-end forecast appears. With an AI
   key set, press **Ask Dovie**. In Calendar, add a time block.
6. In Settings, download your data and check that the JSON opens and holds what you added. Delete the test
   account.
7. The privacy and terms pages show your support email as a link.

Then work through the [phone checklist](phone-checklist.md).

## 6. Automated checks

CI (`.github/workflows/ci.yml`) runs lint, a type check, the offline tests and a build on every pull request.
The database tests and end-to-end tests need a **separate test Supabase project**, never the live one; see
[testing](testing.md).

## Custom domain

1. Buy the domain, add it under Vercel **Project Settings > Domains**, and set the DNS records Vercel shows.
2. Set `NEXT_PUBLIC_SITE_URL` to `https://<domain>` and redeploy.
3. In Supabase, change **Site URL** and add `https://<domain>/auth/callback` to **Redirect URLs**.
4. Add the domain in Google Search Console and Bing Webmaster Tools, set their codes if they changed, and
   submit `https://<domain>/sitemap.xml`.
5. Check that sign-in, Google sign-in, the password-reset email and `/sitemap.xml` work on the new address.

## Notes

- **Region:** create the Supabase project in Mumbai (`ap-south-1`) if you are starting fresh. Setting the
  Vercel function region to `bom1` (Project Settings > Functions) keeps server rendering close to the database.
- **Plan:** Supabase pauses free projects after a week without activity. Move to a paid plan before inviting
  people.
- **Bill reminders:** browser notifications show only while Dovie is open. For reminders when it is closed,
  set up [email bill reminders](bill-reminders.md).
