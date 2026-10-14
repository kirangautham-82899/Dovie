# Dovie web

A gentle daily companion: plans, habits, movement, wellness, money, an encrypted journal, a weekly
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
| `src/features/journal/crypto.ts` | Journal encryption, implementing `docs/crypto-spec.md` |
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
npm run test:crypto
```

`test:rls`, `test:tasks`, `test:habits`, `test:checkin` and `test:life` run against your Supabase project
and need email confirmation turned off while they run.
