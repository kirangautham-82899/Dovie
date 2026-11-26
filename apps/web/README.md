# Dovie web

A gentle daily companion: plans, habits, movement, wellness, money, a private (not end-to-end encrypted) journal, a month
calendar and a weekly review. Next.js (App Router) + Supabase, deployed on Vercel.

## Run locally

```bash
npm install
```

```bash
npm run dev
```

Copy `.env.example` to `.env` and fill in your Supabase URL and publishable (anon) key first. The database
schema lives in `../../supabase/migrations`; see [`../../docs/deploy.md`](../../docs/deploy.md) for applying it
and for production setup.

## Layout

| Path | What it is |
|---|---|
| `src/app/page.tsx` | Public landing page |
| `src/app/(app)/*` | Signed-in screens: today, goals, money, journal, wellness, calendar, weekly, settings |
| `src/app/auth/callback` | Google sign-in and email confirmation return here |
| `src/features/*` | One folder per feature: `api.ts` (Supabase calls), hooks, components |
| `src/lib/monitoring/` | Error reports (Sentry) and what is removed from them |
| `src/lib/ai-providers.ts` | Ask Dovie's calls to Gemini and Claude |
| `src/proxy.ts` | Session refresh and signed-in/signed-out redirects |

Logic that must be consistent across clients (scores, streaks, bill roll-over, the weekly review,
account deletion) lives in Postgres functions, so the future Flutter app can reuse it.

## Checks

```bash
npm run lint
```

```bash
npm run build
```

```bash
npm run test:offline
```

`test:db` and `test:e2e` need a separate **test** Supabase project. See
[`../../docs/testing.md`](../../docs/testing.md).
