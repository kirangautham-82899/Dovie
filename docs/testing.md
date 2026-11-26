# Testing

Run these from `apps/web`.

## Offline checks (no accounts or keys)

```bash
npm run lint
```

```bash
npm run test:offline
```

`test:offline` covers the forecast, prediction, tracker, mood × money and daily-insight logic, what error
reports are allowed to contain (`test:scrub`), Ask Dovie with each AI provider against a stubbed network
(`test:ai`) and the reminder emails (`test:bill-email`).

`test:ai` checks how Dovie builds requests and handles replies. It does **not** show that a real key works or
that a model name is still served. Before a release, press **Ask Dovie** once with each provider's key set.

## A test Supabase project

The database tests and end-to-end tests create and delete users, so they need a project of their own.
**Never point them at the live project.** The end-to-end config and CI both refuse the live one; the
`test:db` scripts run against whatever is in your environment or `.env`, so check it first.

One-time setup:

1. Create a second Supabase project (the free plan is enough).
2. In its **SQL Editor**, run every file in `supabase/migrations` in filename order.
3. Turn **off** **Authentication > Sign In / Providers > Email > Confirm email**.
4. Under **Authentication > Rate Limits**, raise the sign-up limit if runs start failing with
   "rate limit exceeded"; one CI run creates about a dozen users.
5. In GitHub, add the repository secrets `E2E_SUPABASE_URL` and `E2E_SUPABASE_ANON_KEY` (the publishable key)
   under **Settings > Secrets and variables > Actions**.
6. Make the **supabase** CI job a required check in the branch protection rule for `main`.

Until the secrets exist, the CI job passes with a warning and **none of these tests run**. Pull requests from
forks never receive secrets, so they skip too.

## Database tests

`test:db` runs `test:rls`, `test:tasks`, `test:habits`, `test:checkin` and `test:life`. To run them locally,
set the test project's values in your shell (they win over `.env`):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://<test-ref>.supabase.co"
```

```powershell
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "<test publishable key>"
```

```powershell
npm run test:db
```

Throwaway `@example.com` users are left behind; delete them in **Authentication > Users** now and then.

## End-to-end tests

One Playwright journey: sign up, onboarding, add a plan, evening check-in, add and tick a habit, add an
expense, save a journal page, download the data and delete the account.

```powershell
$env:E2E_SUPABASE_URL = "https://<test-ref>.supabase.co"
```

```powershell
$env:E2E_SUPABASE_ANON_KEY = "<test publishable key>"
```

```powershell
npx playwright install chromium
```

```powershell
npm run test:e2e
```

It builds the app first. Stop `npm run start` on port 3100 if something is already using it.
