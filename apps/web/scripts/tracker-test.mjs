// Checks the fitness tracker maths and the savings finder with fixed inputs.
// Run from apps/web:  npm run test:tracker   (no Supabase needed)
import {
  StepDetector,
  formatDuration,
  formatPace,
  haversine,
  kcal,
  metFor,
  routePath,
  thinRoute,
} from "../src/features/fitness/tracker/engine.ts";
import { analyseSavings, monthlyCost } from "../src/features/money/savings.ts";
import { forecastMoney } from "../src/features/money/forecast.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};

// ---------- distance ----------
{
  // One degree of latitude is ~111.2 km.
  const d = haversine(12, 77, 13, 77);
  check("haversine: 1° latitude ≈ 111.2 km", Math.abs(d - 111_195) < 200, d);
  check("haversine: same point is 0", haversine(12.97, 77.59, 12.97, 77.59) === 0);
}

// ---------- formatting ----------
check("duration under an hour", formatDuration(75) === "1:15", formatDuration(75));
check("duration over an hour", formatDuration(3725) === "1:02:05", formatDuration(3725));
check("pace 5:42", formatPace(342) === "5:42", formatPace(342));
check("pace rounds 59.6 s up to the next minute", formatPace(359.6) === "6:00", formatPace(359.6));
check("no pace without distance", formatPace(null) === "–");

// ---------- calories ----------
{
  // 30 min brisk walk (5 km/h) for 70 kg: MET ~4.25 -> ~149 kcal.
  const met = metFor("walk", 3.5, 5 / 3.6);
  const k = kcal(met, 70, 1800);
  check("walking MET from speed is ~4", met > 3.8 && met < 4.6, met);
  check("30 min walk burns 120-180 kcal", k > 120 && k < 180, k);
  check("standing still uses the base MET", metFor("run", 9, null) === 9);
  check("running 10 km/h MET ~10", Math.abs(metFor("run", 9, 10 / 3.6) - 10.2) < 0.5);
}

// ---------- step detector ----------
{
  // A 2 Hz walk: a clean sine on top of gravity, sampled at 50 Hz for 10 s.
  const det = new StepDetector();
  let steps = 0;
  for (let i = 0; i < 500; i++) {
    const t = i * 20;
    const z = 9.81 + 3 * Math.sin((2 * Math.PI * 2 * t) / 1000);
    steps += det.sample(0, 0, z, t);
  }
  check("2 Hz walk for 10 s counts ~20 steps", steps >= 16 && steps <= 21, steps);

  // Phone lying still: no steps.
  const still = new StepDetector();
  let none = 0;
  for (let i = 0; i < 500; i++) none += still.sample(0.02, 0.01, 9.81 + (i % 2 ? 0.03 : -0.03), i * 20);
  check("a still phone counts no steps", none === 0, none);

  // A single jolt: no steps (needs a rhythm of four).
  const jolt = new StepDetector();
  let j = 0;
  for (let i = 0; i < 200; i++) j += jolt.sample(0, 0, i === 50 ? 20 : 9.81, i * 20);
  check("one jolt counts no steps", j === 0, j);
}

// ---------- routes ----------
{
  const route = Array.from({ length: 3000 }, (_, i) => [12 + i * 1e-5, 77 + i * 1e-5]);
  const thin = thinRoute(route);
  check("route thinning halves a long route", thin.length <= 1501 && thin.length > 1000, thin.length);
  check("route thinning keeps the last point", thin[thin.length - 1] === route[route.length - 1]);
  check("route path starts with M", routePath([[12, 77], [12.001, 77.001]], 100, 100).startsWith("M"));
  check("route path is empty for one point", routePath([[12, 77]], 100, 100) === "");
}

// ---------- savings ----------
{
  check("weekly bill monthly cost", monthlyCost({ amount_paise: 1200, recurrence: "weekly" }) === 5200);
  check("yearly bill monthly cost", monthlyCost({ amount_paise: 12000, recurrence: "yearly" }) === 1000);

  const exp = (spent_on, rupees, category) => ({ id: spent_on + rupees + category, spent_on, amount_paise: rupees * 100, category, note: null });
  // History: Food ₹6,000 a month for three months.
  const history = [];
  for (const m of ["07", "08", "09"]) for (let d = 1; d <= 30; d++) history.push(exp(`2026-${m}-${String(d).padStart(2, "0")}`, 200, "Food"));
  // This month: Food at ₹400/day for 15 days, plus 20 small ₹120 coffees.
  const month = [];
  for (let d = 1; d <= 15; d++) month.push(exp(`2026-10-${String(d).padStart(2, "0")}`, 400, "Food"));
  for (let d = 1; d <= 15; d++) month.push(exp(`2026-10-${String(d).padStart(2, "0")}`, 120, "Everyday"));
  const bills = [
    { id: "a", title: "Streaming", amount_paise: 49900, due_date: "2026-10-20", recurrence: "monthly", last_paid_on: null },
    { id: "b", title: "Phone", amount_paise: 59900, due_date: "2026-10-25", recurrence: "monthly", last_paid_on: null },
  ];
  const data = { expenses: month, history, bills, budgets: [], goals: [] };
  const f = forecastMoney({ today: "2026-10-15", month, history, bills, budgets: [], goals: [] });
  const a = analyseSavings(data, f, 50_000_00);

  check("usual monthly spend comes from history", Math.round(a.avgMonthly / 100) === 6000, a.avgMonthly);
  const food = a.tips.find((t) => t.category === "Food");
  check("spots Food running above usual", !!food, JSON.stringify(a.tips.map((t) => t.id)));
  check("Food saving is believable (not above the overspend)", food && food.monthlySaving > 0 && food.monthlySaving <= f.categories.find((c) => c.category === "Food").projected - 600000 + 5000, food?.monthlySaving);
  check("spots the small everyday purchases", a.tips.some((t) => t.id === "small-Everyday"), JSON.stringify(a.tips.map((t) => t.id)));
  check("suggests reviewing repeat bills", a.tips.some((t) => t.id === "subscriptions"));
  check("potential is the sum of tips", a.potential === a.tips.reduce((s, t) => s + t.monthlySaving, 0));
  check("20% savings target from income", a.savingsTarget === 10_000_00, a.savingsTarget);
  check("at most five tips", a.tips.length <= 5);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll tracker and savings checks passed");
process.exit(failed ? 1 : 0);
