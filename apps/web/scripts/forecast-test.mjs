// Checks the money forecast maths with fixed inputs.
// Run from apps/web:  npm run test:forecast   (no Supabase needed)
import { forecastMoney } from "../src/features/money/forecast.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};

const exp = (spent_on, rupees, category = "Food") => ({ spent_on, amount_paise: rupees * 100, category });
const base = { history: [], bills: [], budgets: [], goals: [] };

// 1. No history: steady ₹100/day for 10 days of a 31-day month -> ₹3,100.
{
  const month = Array.from({ length: 10 }, (_, i) => exp(`2026-10-${String(i + 1).padStart(2, "0")}`, 100));
  const f = forecastMoney({ ...base, today: "2026-10-10", month });
  check("steady pace projects linearly", f.projected === 310000, f.projected);
  check("perfectly steady spending has a zero-width range", f.low === f.projected && f.high === f.projected, `${f.low}-${f.high}`);
  check("days left is 21", f.daysLeft === 21);
  check("series ends at the projection", f.series.at(-1).projected === 310000);
  check("series has actuals only up to today", f.series[9].actual === 100000 && f.series[10].actual === null);
  check("no history gives low confidence early in the month", f.confidence === "low");
}

// 2. History pulls an early-month spike back toward normal.
{
  const history = Array.from({ length: 30 }, (_, i) => exp(`2026-09-${String(i + 1).padStart(2, "0")}`, 100));
  const month = [exp("2026-10-01", 2000)]; // one big day on the 1st
  const naive = forecastMoney({ ...base, today: "2026-10-01", month });
  const blended = forecastMoney({ ...base, today: "2026-10-01", month, history });
  check("without history a spike is extrapolated", naive.projected === 2000 * 100 * 31, naive.projected);
  check("with history the spike is mostly discounted", blended.projected < 800000 && blended.projected > 500000, blended.projected);
  check("last month total is known from history", blended.lastMonthTotal === 300000, blended.lastMonthTotal);
  check("a spiky day widens the range", blended.high > blended.projected && blended.low < blended.projected);
  check("low never drops below what is already spent", blended.low >= blended.spentSoFar);
}

// 3. Budgets: over, tight, on track.
{
  const month = [
    ...Array.from({ length: 10 }, (_, i) => exp(`2026-10-${String(i + 1).padStart(2, "0")}`, 100, "Food")),
    exp("2026-10-05", 300, "Fun"),
    exp("2026-10-05", 50, "Transport"),
  ];
  const budgets = [
    { category: "Food", monthly_limit_paise: 200000 }, // projects 3,100 -> over
    { category: "Fun", monthly_limit_paise: 1000_00 }, // projects 930 -> tight
    { category: "Transport", monthly_limit_paise: 1000_00 }, // projects 155 -> on track
  ];
  const f = forecastMoney({ ...base, today: "2026-10-10", month, budgets });
  const s = Object.fromEntries(f.categories.map((c) => [c.category, c.status]));
  check("Food is projected over budget", s.Food === "over", s.Food);
  check("Fun is tight", s.Fun === "tight", s.Fun);
  check("Transport is on track", s.Transport === "on-track", s.Transport);
  check("riskiest categories sort first", f.categories[0].category === "Food");
}

// 4. Bills and savings goals.
{
  const bills = [
    { amount_paise: 99900, due_date: "2026-10-20" },
    { amount_paise: 50000, due_date: "2026-11-05" },
    { amount_paise: null, due_date: "2026-10-25" },
  ];
  const goals = [
    // ₹1,000 saved in 10 days -> ₹100/day; ₹2,000 left -> 20 days.
    { id: "a", title: "Trip", target_paise: 300000, saved_paise: 100000, target_date: "2026-12-31", created_at: "2026-09-30T10:00:00Z" },
    { id: "b", title: "Laptop", target_paise: 300000, saved_paise: 100000, target_date: "2026-10-15", created_at: "2026-09-30T10:00:00Z" },
    { id: "c", title: "New", target_paise: 100000, saved_paise: 0, target_date: null, created_at: "2026-10-09T10:00:00Z" },
    { id: "d", title: "Done", target_paise: 100000, saved_paise: 100000, target_date: null, created_at: "2026-09-01T10:00:00Z" },
  ];
  const f = forecastMoney({ ...base, today: "2026-10-10", month: [exp("2026-10-01", 10)], bills, goals });
  const g = Object.fromEntries(f.goals.map((x) => [x.id, x]));
  check("only this month's bills count", f.billsDueThisMonth === 99900, f.billsDueThisMonth);
  check("goal ETA extrapolates the saving rate", g.a.eta === "2026-10-30" && g.a.status === "on-track", JSON.stringify(g.a));
  check("a goal that will miss its date is behind", g.b.status === "behind", g.b.status);
  check("a goal with nothing saved has no ETA", g.c.status === "no-data" && g.c.eta === null);
  check("a finished goal is done", g.d.status === "done");
  check("needed per month is reported for dated goals", g.b.neededPerMonth > 0);
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll forecast checks passed");
process.exit(failed ? 1 : 0);
