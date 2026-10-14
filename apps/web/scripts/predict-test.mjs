// Checks the weekly predictor with fixed inputs.
// Run from apps/web:  npm run test:predict   (no Supabase needed)
import { predictWeek, projectNext } from "../src/features/weekly/predict.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// 28 days ending Tue 2026-10-13, oldest first.
const dates = Array.from({ length: 28 }, (_, i) => new Date(Date.UTC(2026, 8, 16 + i)).toISOString().slice(0, 10));
const day = (d, o = {}) => ({
  day: d,
  tasks_planned: 0,
  tasks_done: 0,
  habits_done: 0,
  habits_total: 0,
  mood: null,
  sleep_hours: null,
  focus_minutes: 0,
  movement_minutes: 0,
  ...o,
});

// projectNext
check("flat series predicts the same value", near(projectNext([0.5, 0.5, 0.5, 0.5]), 0.5));
check("a single point predicts itself", projectNext([null, null, 0.7, null]) === 0.7);
check("no data predicts nothing", projectNext([null, null, null, null]) === null);
{
  const up = projectNext([0.4, 0.5, 0.6, 0.7]);
  check("a rising trend predicts higher, but damped below a straight extrapolation", up > 0.6 && up < 0.8, up);
}

// Empty input
{
  const p = predictWeek(dates.map((d) => day(d)));
  check("no logging means not enough data", p.enoughData === false);
  check("no logging gives no predictions", p.metrics.every((m) => m.predicted === null));
}

// Rising completion, falling sleep, a strong weekday.
{
  const days = dates.map((d, i) => {
    const week = Math.floor(i / 7); // 0..3
    const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
    const done = wd === 2 ? 4 : 1 + week >= 4 ? 3 : 1 + Math.min(week, 2); // Tuesdays always 4/4
    return day(d, {
      tasks_planned: 4,
      tasks_done: Math.min(4, done),
      habits_total: 2,
      habits_done: 1,
      sleep_hours: 8 - week * 0.5 - (wd === 1 ? 2 : 0), // Mondays short
      mood: 3,
      focus_minutes: 25,
    });
  });
  const p = predictWeek(days);
  const m = Object.fromEntries(p.metrics.map((x) => [x.key, x]));
  check("enough data with daily logging", p.enoughData);
  check("four weekly points are summarised", m.completion.weeks.length === 4 && m.completion.weeks.every((v) => v !== null));
  check("completion is predicted to rise", m.completion.direction === "up", JSON.stringify(m.completion));
  check("completion stays within 0..1", m.completion.predicted <= 1 && m.completion.predicted >= 0);
  check("sleep is predicted to fall", m.sleep.direction === "down", JSON.stringify(m.sleep));
  check("sleep sliding three weeks running is flagged", p.risks.includes("Sleep, on average"), p.risks.join(","));
  check("steady habits stay steady", m.habits.direction === "steady" && near(m.habits.predicted, 0.5));
  check("steady mood stays steady", m.mood.direction === "steady");
  check("four weeks of data is high confidence", m.completion.confidence === "high");
  check("Tuesday is the strongest day", p.bestDay?.weekday === "Tuesday", JSON.stringify(p.bestDay));
  check("a suggested daily load is offered", p.suggestedPlansPerDay >= 1 && p.suggestedPlansPerDay <= 4, p.suggestedPlansPerDay);
}

// Sleep effect needs both groups; weekday pattern needs a real spread.
{
  const days = dates.map((d, i) =>
    day(d, { tasks_planned: 2, tasks_done: i % 2 ? 2 : 1, sleep_hours: i % 2 ? 8 : 6 }),
  );
  const p = predictWeek(days);
  check("sleep effect compares rested and tired days", p.sleepEffect && p.sleepEffect.rested === 1 && p.sleepEffect.tired === 0.5, JSON.stringify(p.sleepEffect));
  const flat = predictWeek(dates.map((d) => day(d, { tasks_planned: 2, tasks_done: 1 })));
  check("no weekday pattern when every day is the same", flat.bestDay === null && flat.hardestDay === null);
  check("no sleep effect without sleep logs", flat.sleepEffect === null);
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll prediction checks passed");
process.exit(failed ? 1 : 0);
