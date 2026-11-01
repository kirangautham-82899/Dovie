// Checks which "Dovie noticed" insight Today picks, with fixed inputs.
// Run from apps/web:  npm run test:daily-insight   (no Supabase needed)
import { pickDailyInsight, pickPlanInsight } from "../src/features/today/daily-insight.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};

const fmt = (p) => `₹${Math.round(p / 100)}`;
const base = { minDays: 10, fmt, categories: [] };
const pattern = {
  signal: "mood",
  ratio: 2,
  lowAvg: 80000,
  restAvg: 40000,
  topCategory: "Food",
  monthlyCost: 600000,
};
const ready = (extra = {}) => ({ ready: true, days: 14, insights: [pattern], calm: [], today: null, ...extra });
const cat = (category, status, projected, limit) => ({ category, spent: 0, projected, limit, status });

// 1. No data at all says nothing.
check("nothing to say returns null", pickDailyInsight({ ...base, moodMoney: null }) === null);

// 2. Still gathering check-ins shows progress.
{
  const r = pickDailyInsight({ ...base, moodMoney: { ready: false, days: 4, insights: [], calm: [], today: null } });
  check("learning shows progress", r?.tone === "learning" && r.progress?.done === 4 && r.progress?.total === 10, JSON.stringify(r));
}

// 3. Learning progress never exceeds the total.
{
  const r = pickDailyInsight({ ...base, moodMoney: { ready: false, days: 99, insights: [], calm: [], today: null } });
  check("progress is capped", r?.progress?.done === 10, JSON.stringify(r));
}

// 4. A strong pattern is reported.
{
  const r = pickDailyInsight({ ...base, moodMoney: ready() });
  check("pattern is picked", r?.id === "pattern-mood" && r.title.includes("2.0×") && r.body.includes("Food"), JSON.stringify(r));
}

// 5. A low day today beats everything else.
{
  const r = pickDailyInsight({
    ...base,
    categories: [cat("Fun", "over", 500000, 300000)],
    moodMoney: ready({ today: { mood: 1, energy: null, sleep: null } }),
  });
  check("low day today comes first", r?.id === "low-today-mood" && r.tone === "watch", JSON.stringify(r));
}

// 6. A broken budget beats a general pattern, and the biggest overshoot wins.
{
  const r = pickDailyInsight({
    ...base,
    categories: [cat("Fun", "over", 320000, 300000), cat("Food", "over", 900000, 500000), cat("Home", "on-track", 100, 1000)],
    moodMoney: ready(),
  });
  check("biggest overshoot is chosen", r?.id === "over-Food", JSON.stringify(r));
}

// 7. A tight budget is mentioned only when nothing bigger applies.
{
  const r = pickDailyInsight({ ...base, categories: [cat("Food", "tight", 480000, 500000)], moodMoney: null });
  check("tight budget is mentioned", r?.id === "tight-Food", JSON.stringify(r));
}

// 8. Good news: steady spending, then all budgets fine.
{
  const calm = pickDailyInsight({ ...base, moodMoney: ready({ insights: [], calm: ["mood"] }) });
  check("steady spending is celebrated", calm?.id === "steady" && calm.tone === "win", JSON.stringify(calm));
  const ok = pickDailyInsight({ ...base, categories: [cat("Food", "on-track", 100, 1000)], moodMoney: null });
  check("budgets on track is celebrated", ok?.id === "budgets-ok", JSON.stringify(ok));
}

// 9. A low day only matters if that pattern is known.
{
  const r = pickDailyInsight({
    ...base,
    moodMoney: { ready: false, days: 3, insights: [], calm: [], today: { mood: 1, energy: 1, sleep: 4 } },
  });
  check("low day is ignored while still learning", r?.tone === "learning", JSON.stringify(r));
}

// 10. Enough check-ins but nothing notable still says something (the card must never vanish).
{
  const r = pickDailyInsight({ ...base, moodMoney: ready({ insights: [], calm: [] }) });
  check("ready with no pattern shows 'even'", r?.id === "even" && r.tone === "win", JSON.stringify(r));
}

// 11. Month pace is shown when still learning but there is spending.
{
  const r = pickDailyInsight({
    ...base,
    moodMoney: { ready: false, days: 2, insights: [], calm: [], today: null },
    pace: { spent: 120000, projected: 400000, daysLeft: 1 },
  });
  check("pace beats learning", r?.id === "pace" && r.body.includes("1 day to go"), JSON.stringify(r));
}

// 12. A brand-new money page invites the first expense.
{
  const r = pickDailyInsight({
    ...base,
    moodMoney: { ready: false, days: 0, insights: [], calm: [], today: null },
    pace: { spent: 0, projected: 0, daysLeft: 20 },
    hasMoneyData: false,
  });
  check("empty money page invites first expense", r?.id === "start", JSON.stringify(r));
}

// 13. Plans that keep slipping are called out, worst first.
{
  const t = (title, carry_count, done = false) => ({ title, carry_count, completed_at: done ? "x" : null });
  const r = pickPlanInsight([t("workout", 8), t("meeting with kiran", 6), t("done thing", 9, true), t("new", 0)]);
  check(
    "slipping plans are called out",
    r?.id === "slipping-workout" && r.title.includes("8 times") && r.body.includes("2 plans"),
    JSON.stringify(r),
  );
  check("one slipping plan has the singular advice", pickPlanInsight([t("a", 3)])?.body.startsWith("Try a five-minute"));
  check("a finished day is celebrated", pickPlanInsight([t("a", 0, true), t("b", 1, true)])?.id === "all-done");
  check("quiet day says nothing", pickPlanInsight([t("a", 1)]) === null && pickPlanInsight([]) === null);
}

console.log(failed === 0 ? "\nAll daily-insight checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
