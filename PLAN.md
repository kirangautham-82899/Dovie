# Dovie: Build Plan (Web first, then Flutter)

Assumptions: solo, part-time (about 15-20 hrs/week), building with AI help, in India, ₹0 budget to start.

## 0. Principles
1. **Backend-first.** Supabase holds the schema, RLS, scoring and streak logic, so Flutter later reuses everything.
2. **Ship small.** Don't start a release until the previous one has been used by real people.
3. **Design for mobile now.** Build the web app mobile-first and responsive, so the Flutter port is a re-skin and not a redesign.
4. **Privacy is a feature.** Delete and export, RLS, and journal encryption are planned in from the start.

## 1. Final stack

| Layer | Web (Phase 1) | Mobile (Phase 2) |
|---|---|---|
| App | Next.js (App Router) + TypeScript | Flutter + Dart |
| UI | Tailwind + shadcn/ui | Material 3 with a custom Dovie theme |
| State/data | TanStack Query | Riverpod + Drift (offline) |
| Forms | React Hook Form + Zod | Flutter form widgets |
| Charts | Recharts | fl_chart |
| Backend (shared) | Supabase: Postgres (Mumbai), Auth (email + Google), RLS, Edge Functions, pg_cron | same |
| Reminders | Resend email, then Web Push | FCM + flutter_local_notifications |
| Journal crypto | Web Crypto (AES-GCM, PBKDF2/Argon2) | `cryptography` package, same format |
| Monitoring | Sentry + PostHog | same |
| Testing | Vitest + Playwright | flutter_test + integration_test |
| Hosting/CI | Vercel + GitHub Actions | Codemagic or GitHub Actions |
| AI (later) | Claude API via an Edge Function only | same endpoint |

**Repo layout (monorepo):** `/apps/web`, `/apps/mobile`, `/supabase` (migrations, functions, seed), `/docs` (data model, crypto spec, API contract).

## 2. Phase plan (solo estimates)

### Phase A: Foundation (Weeks 1-2)
- Settle the name: check the domain, app stores and IP India trademark search.
- Wireframe the Today screen, onboarding and check-in (Figma).
- Set up the repo, Supabase project (Mumbai), GitHub Actions and Vercel.
- Write the schema migrations: `profiles, goals, tasks, habits, habit_logs, workout_logs, checkins`. Turn on RLS with a test per table.
- Auth: email and Google sign-in, plus an 18+ confirmation at signup.
- Write `docs/crypto-spec.md` now (algorithm, KDF, ciphertext format, test vectors), even though journal comes later.

**Done when:** you can sign up, log in, and a second user cannot read your rows.

### Phase B: Web MVP (Weeks 3-12, about 3 months)
| Weeks | Build |
|---|---|
| 3-4 | Onboarding (pick focus areas), app shell, Today screen skeleton |
| 5-6 | To-dos, top 3 priorities, carry-over to tomorrow (a scheduled DB function) |
| 7-8 | Goals, habits, streaks, one-tap fitness logging |
| 9-10 | Nightly check-in and daily score (computed in Postgres), weekly summary with charts |
| 11 | Settings: reminders, export my data (JSON), delete my account; Privacy Policy and ToS pages; consent screens |
| 12 | Polish, Sentry and PostHog, Playwright smoke tests, friends beta (10-20 people) |

**Done when:** 10 or more beta users have used it for a week and you have a list of what they dislike.

### Phase C: Web Release 2 (Weeks 13-20)
- **Journal first.** Prompt, mood, free text and a PIN lock, with client-side AES-GCM encryption following the Phase A spec. Add client-side search. Test the "forgot PIN" flow and include a recovery-key option at setup.
- **Bills.** Recurring bills, paid tick, due dates on Today, and email reminders through Resend, triggered by pg_cron plus an Edge Function.
- **Expense log.** Amount, category, note.
- Recurring tasks, dark mode, installable PWA (Serwist), and Web Push where supported.

### Phase D: Web Release 3 (Weeks 21-30)
- Monthly budgets with a nudge, financial goals with a progress bar, spending charts.
- Workout log, sleep/water/mood tracking, focus timer, starter templates.
- Add "not medical advice" and "tracking only, not financial advice" copy.

### Phase E: Flutter app (Weeks 31-46)
Mobile reuses the backend, so effort is mostly UI.
| Weeks | Build |
|---|---|
| 31-32 | Flutter skeleton, theme, Supabase auth, go_router, Riverpod, Drift setup |
| 33-36 | MVP screens: Today, to-dos, habits, fitness, check-in, weekly summary |
| 37-39 | Journal (port the crypto spec and pass the shared test vectors), biometric lock |
| 40-42 | Bills, expenses, budgets, goals, FCM push and local notifications |
| 43-44 | Offline sync, deep links, widgets (optional) |
| 45-46 | Closed testing on Play, TestFlight, store listings, Apple privacy labels and in-app account deletion |

### Phase F: Smart Dovie (Weeks 47+)
- Insights: correlations such as sleep vs. tasks done, computed in SQL.
- AI coach through an Edge Function. It is opt-in, never sends journal text without consent, and gets disclosure and consent screens.
- Calendar and time-blocking, accountability buddy, and "this day last month" look-back.
- Start charging only when you reach this point (see section 5).

## 3. Key technical decisions to lock early
| Decision | Choice |
|---|---|
| Where logic lives | Postgres functions and Edge Functions (score, streaks, summaries), not the clients |
| Offline | Web is online-only at first. Mobile uses Drift with last-write-wins sync and an `updated_at` column on every table |
| IDs and time | UUIDs everywhere, timestamps in UTC, user timezone stored in `profiles` ("today" is computed server-side per timezone) |
| Soft deletes | `deleted_at` on user content, plus a hard-delete job for account deletion |
| Journal key | Derived from the PIN, with an optional recovery key. Consequence: no server-side search or AI over journal text |
| Money | Store amounts as integer paise, never floats |

## 4. Quality gates (per release)
- RLS tests for every new table.
- Playwright coverage of the critical path (sign up, add task, check-in).
- Sentry free of new errors for 3 days before moving on.
- Run Lighthouse and an accessibility check (contrast, keyboard use, labels).
- Run an export and delete test against a real account.

## 5. Legal and business checkpoints
- **Before the friends beta:** Privacy Policy, ToS, consent notice, 18+ gate.
- **Before public launch:** have a lawyer review the policies. The DPDP heavy obligations arrive around May 2027, so plan for a breach-notification process and a grievance contact.
- **Before charging:** register an entity (proprietorship, LLP or Pvt Ltd), move off Vercel Hobby, set up GST if over the threshold, and add Razorpay.
- **Stores:** Google Play ($25 one-time) and Apple ($99/yr) at Phase E. Apple review needs in-app account deletion.

## 6. Costs
| Stage | Monthly |
|---|---|
| Beta and Phases A-D | about ₹0 (domain ₹800-1,000/yr) |
| Public launch | Supabase Pro about $25, Vercel Pro $20, a paid tier of Resend/Sentry only if you exceed free limits |
| Mobile | $25 one-time (Google) and $99/yr (Apple) |

## 7. Main risks and mitigations
| Risk | Mitigation |
|---|---|
| Scope creep | Release gates in section 2; any new idea goes on a "later" list |
| Journal key loss | Recovery key at setup and clear warnings |
| Free-tier limits and pausing | Monitor usage; upgrade Supabase before public launch |
| Solo burnout | Weekly demo to a friend; re-estimate at the end of Weeks 5-6 |
| No UI skill | Use shadcn defaults, a fixed spacing and colour system, and a Figma template |
| Duplicate logic across clients | Everything computed lives in Postgres or Edge Functions |

## 8. Immediate next steps
1. Confirm the name (domain, stores, trademark search).
2. Create the GitHub repo, Supabase project (Mumbai) and Vercel project.
3. Sketch the Today screen.
4. Scaffold `/apps/web` and `/supabase` with the first migrations and RLS.
