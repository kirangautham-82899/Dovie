# Changelog

## 2026-10-19

### Today
- Today is a dot-grid notebook page: four sticky-note stats, a daily one-line message and a quick notes pad
  saved on the device. Habit check-off moved to Goals and the top three to the Planner day panel. (`bd403b9`)

### Money
- **Notebook page.** Money uses the same dot-grid paper as Today, with sticky-note stats, compact add buttons in
  the header and tighter cards in two stacked columns. Paper, Slip and Sticky now live in
  `components/notebook.tsx`. (`777a541`)
- **Income tracking.** A new `incomes` table (migration `20261019000000_incomes.sql`, covered by row-level security
  and `clear_my_data`). The page now leads with Earned, Spent, Left and Saved. A single monthly list shows money in and
  out, with In/Out filters. "Where it went" combines categories and budgets. The forecast shows how much of your
  income you're on pace to keep, and the savings coach uses the income you log and starts collapsed. (`3ae7967`)
- **Mood × Money.** A card that compares evening check-ins (mood, energy, sleep) with daily spending. It shows the
  strongest pattern, roughly what it costs a month, a gentle tip, spend per day by mood, and a same-day heads-up on
  low days. It's worked out on the device, and `npm run test:mood-money` covers it. (`614eca6`)

### Fitness
- Fitness uses the notebook page too. Week stats are sticky notes, and today's rings sit beside Start in one slip.
  The cards are denser and stack in two columns, and the step-counter explainer folds away. (`e694676`)

### Search (SEO)
- robots.txt also disallows `/fitness` and `/planner` and drops the non-standard Host line. Sitemap entries now
  carry a `lastModified` date. (`ab8f66a`)
- Five public keyword pages: `/habit-tracker`, `/expense-tracker`, `/daily-planner`, `/mood-tracker`,
  `/private-journal`. Each has its own title, description, canonical, 500–700 words of copy, how-to steps, an FAQ,
  and WebPage, SoftwareApplication, BreadcrumbList and FAQPage structured data. The pages are public in the proxy,
  listed in the sitemap and linked from the landing page. (`67b6694`)
- Search Console: the sitemap is submitted and processed. Resubmit it after deploys to pick up new pages.
