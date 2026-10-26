# Changelog

## 2026-10-26

### Wellness
- **Mental health** is a fourth tab: a private daily check-in (feelings, stress from 1 to 5 and an optional short
  note) with a seven-day stress strip, a box-breathing circle, a folded 5-4-3-2-1 grounding exercise and a note on
  where to turn for support (Tele-MANAS 14416 in India). Migration `20261026200000_mind.sql` adds `mind_logs` (row-level
  security, cleared by "clear my data", included in the export, never kept in the device cache or used for insights);
  apply it before using the tab.
- Wellness uses the Today look: a dot-grid notebook page with four sticky notes (sleep, water, energy, movement) and
  three tabs so nothing crowds the page. **Today** holds the check-in and focus timer, with the starter templates
  folded away. **Diet** is a new diet diary: breakfast, lunch, dinner and snacks, with optional calories and a day
  switcher. **Period tracker** is new: tap a day to log flow and symptoms, see the day of your cycle, a
  six-week strip with the next period marked, and an estimate from your last few cycles. Migration
  `20261026100000_cycle_diet.sql` adds `period_logs` and `meals` (row-level security, cleared by "clear my data",
  included in the export); apply it before using Diet and Period tracker. Period data is never kept in the device cache.

### Journal
- **The Journal is an open book, with no passphrase.** Contents and search sit on the left page; the right page is
  a dot-grid notebook page for the day: a highlighted date, the day's prompt, a "how are you feeling?" mood row, a
  borderless writing area and a "grateful for" line. Turn to any earlier day with the arrows, or pick it from the
  contents. The page heading is smaller.
- **Plain, not end-to-end encrypted.** Pages are saved as text on the account (migration
  `20261026000000_journal_plain.sql` adds `body` and `gratitude` and makes `ciphertext` optional; apply it before
  using the new Journal). Pages from the old encrypted journal stay in place as "older private pages" that can be
  deleted or written over. The passphrase, recovery key and crypto code (`crypto.ts`, `session.ts`, `test:crypto`) are
  gone, and the landing, privacy, terms, settings and SEO copy no longer claims encryption.

### Planner
- The Planner heading is smaller and sits on one line with its tagline.
- The month calendar is gone. The Planner is a dot-grid notebook spread, one day at a time (previous/next day and
  Today in the header). The left page is **Plan your day**: a **Top 3** of three numbered lines you write straight
  onto (they are the day's starred priorities, so the three-a-day limit still holds), then the rest of the to-do
  list on ruled lines. The right page is a new **Timetable**, one ruled row per hour from 6 am to 11 pm; write on a
  line to add an entry. Entries use the existing `time_blocks` table, so they also appear on the Calendar page.

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
