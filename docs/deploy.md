# Deploying Dovie (Vercel + Supabase)

Production runs the Next.js app in `apps/web` on Vercel, with Supabase for the database and sign-in.
Supabase project: `lvzbonyyvieaylwqwukv` (the one in `apps/web/.env`).

## 1. Apply the database migrations

Migrations live in `supabase/migrations` and must run in filename order. The first three
(`20261008`, `20261009`, `20261010`) are already applied to the project. These are still pending:

1. `20261011000000_checkins.sql`
2. `20261012000000_profile_wellness.sql`
3. `20261012100000_money.sql`
4. `20261012200000_journal.sql`
5. `20261012300000_calendar_review_account.sql`

In the Supabase dashboard open **SQL Editor > New query**, paste each file's contents in that order and
press **Run**. Each one should finish with "Success. No rows returned".

> Use the SQL editor rather than `supabase db push`: the earlier migrations were applied by hand, so the
> CLI's migration history is empty and it would try to re-run them.

Then check it worked from `apps/web` (needs **Authentication > Sign In / Providers > Email > Confirm email**
switched off while the tests run; they create throwaway `@example.com` users):

```bash
npm run test:rls
npm run test:checkin
npm run test:life
npm run test:crypto
```

## 2. Configure Supabase Auth

**Authentication > URL Configuration**

- **Site URL:** your production URL, e.g. `https://dovie.vercel.app` (or your custom domain).
- **Redirect URLs:** add
  - `https://<your-production-domain>/auth/callback`
  - `https://*-<your-vercel-team>.vercel.app/auth/callback` (preview deployments)
  - `http://localhost:3000/auth/callback` (local development)

**Google sign-in** (optional, but the button is on the sign-in and sign-up pages)

1. In Google Cloud Console, create an **OAuth client ID** of type *Web application*.
2. Under *Authorized redirect URIs*, add `https://lvzbonyyvieaylwqwukv.supabase.co/auth/v1/callback`.
3. In Supabase, open **Authentication > Sign In / Providers > Google**, turn it on, and paste the client ID
   and secret.

**Email confirmation:** switch **Confirm email** back on for production. The confirmation link returns
people to `/auth/callback`, which signs them in and sends them to onboarding.

## 3. Create the Vercel project

1. Push the repo to GitHub, then in Vercel choose **Add New > Project** and import it.
2. **Root Directory:** `apps/web`. Vercel detects Next.js; keep the default build and install commands.
3. **Environment Variables** (Production, Preview and Development):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://lvzbonyyvieaylwqwukv.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable (anon) key from **Supabase > Project Settings > API Keys** |
   | `NEXT_PUBLIC_SITE_URL` | optional; your custom domain (e.g. `https://dovie.app`) for canonical URLs, the sitemap and share cards. Without it, Vercel's production URL is used. |
   | `ANTHROPIC_API_KEY` | optional; enables **Ask Dovie** on the Money forecast. Create one at console.anthropic.com. Server-only, so never prefix it with `NEXT_PUBLIC_`. |

   Do **not** add the service-role key; the app never needs it. Account deletion runs through the
   `delete_my_account()` database function instead.
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

## 4. Smoke test production

1. Open the site: the landing page loads at `/`.
2. **Join Dovie** with email (or Google), then finish onboarding.
3. On Today, add a plan, star it, tick a habit, log water, and do the evening check-in.
4. In Journal, set a passphrase, **save the recovery key**, write an entry, lock, and unlock again.
5. In Money, add an expense and a bill and mark the bill paid; check the month-end forecast appears, and press
   **Ask Dovie** (needs `ANTHROPIC_API_KEY`). In Calendar, add a time block.
6. In Settings, download your data. Check that the JSON opens and journal text in it is encrypted.

## Notes

- **Region:** create the Supabase project in Mumbai (`ap-south-1`) if you are starting fresh. Setting the
  Vercel function region to `bom1` (Project Settings > Functions) keeps server rendering close to the database.
- **Free tiers:** Supabase pauses free projects after a week without activity; upgrade before a public launch.
- **Bill reminders** are local browser notifications that show only while Dovie is open. Email reminders
  (Resend + `pg_cron`) are planned in `PLAN.md`.
