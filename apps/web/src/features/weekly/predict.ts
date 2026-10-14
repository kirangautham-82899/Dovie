// Next-week predictions from the last four weeks of numbers. Pure functions
// with no imports, so scripts/predict-test.mjs can run them directly in Node.
//
// Method, in plain terms:
// - Each metric is summarised per week (four points, oldest first).
// - The next week is a recency-weighted linear trend, blended 60/40 with the
//   latest week so the projection follows real trends without overshooting,
//   then clamped to a sensible range.
// - Weekday patterns, the sleep effect and the suggested daily load come from
//   simple averages over the same 28 days, and only when there are enough
//   days to say something.

export type PredictDay = {
  day: string;
  tasks_planned: number;
  tasks_done: number;
  habits_done: number;
  habits_total: number;
  mood: number | null;
  sleep_hours: number | null;
  focus_minutes: number;
  movement_minutes: number;
};

export type MetricKey = "completion" | "habits" | "sleep" | "focus" | "movement" | "mood";

export type MetricPrediction = {
  key: MetricKey;
  label: string;
  /** Oldest first; null for weeks with nothing logged. */
  weeks: (number | null)[];
  current: number | null;
  predicted: number | null;
  direction: "up" | "down" | "steady";
  confidence: "low" | "medium" | "high";
};

export type WeekPrediction = {
  enoughData: boolean;
  metrics: MetricPrediction[];
  bestDay: { weekday: string; rate: number } | null;
  hardestDay: { weekday: string; rate: number } | null;
  suggestedPlansPerDay: number | null;
  sleepEffect: { rested: number; tired: number } | null;
  risks: string[];
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

function weekday(date: string) {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

/** Recency-weighted trend blended with the latest value, one step past the last week. */
export function projectNext(values: (number | null)[]): number | null {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  if (pts.length === 0) return null;
  if (pts.length === 1) return pts[0][1];
  const w = pts.map(([i]) => i + 1);
  const W = w.reduce((s, x) => s + x, 0);
  const mx = pts.reduce((s, [x], k) => s + w[k] * x, 0) / W;
  const my = pts.reduce((s, [, y], k) => s + w[k] * y, 0) / W;
  const sxx = pts.reduce((s, [x], k) => s + w[k] * (x - mx) ** 2, 0);
  const sxy = pts.reduce((s, [x, y], k) => s + w[k] * (x - mx) * (y - my), 0);
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const trend = my + slope * (values.length - mx);
  const last = pts[pts.length - 1][1];
  return 0.6 * trend + 0.4 * last;
}

const SPEC: Record<MetricKey, { label: string; min: number; max: number; steady: (cur: number) => number }> = {
  completion: { label: "Plans completed", min: 0, max: 1, steady: () => 0.03 },
  habits: { label: "Habit rhythm", min: 0, max: 1, steady: () => 0.03 },
  sleep: { label: "Sleep, on average", min: 0, max: 14, steady: () => 0.2 },
  focus: { label: "Focus time", min: 0, max: 10_000, steady: (c) => Math.max(10, c * 0.1) },
  movement: { label: "Movement", min: 0, max: 10_000, steady: (c) => Math.max(10, c * 0.1) },
  mood: { label: "Mood", min: 1, max: 5, steady: () => 0.2 },
};

function summarise(week: PredictDay[]): Record<MetricKey, number | null> {
  const planned = week.reduce((s, d) => s + d.tasks_planned, 0);
  const habitTotal = week.reduce((s, d) => s + d.habits_total, 0);
  const focus = week.reduce((s, d) => s + d.focus_minutes, 0);
  const movement = week.reduce((s, d) => s + d.movement_minutes, 0);
  return {
    completion: planned ? week.reduce((s, d) => s + d.tasks_done, 0) / planned : null,
    habits: habitTotal ? Math.min(habitTotal, week.reduce((s, d) => s + d.habits_done, 0)) / habitTotal : null,
    sleep: avg(week.flatMap((d) => (d.sleep_hours === null ? [] : [d.sleep_hours]))),
    // Minutes only count as data once something has been logged at all.
    focus: focus || week.some((d) => d.focus_minutes > 0) ? focus : null,
    movement: movement || week.some((d) => d.movement_minutes > 0) ? movement : null,
    mood: avg(week.flatMap((d) => (d.mood === null ? [] : [d.mood]))),
  };
}

/** @param days the last 28 days, oldest first (shorter input is fine). */
export function predictWeek(days: PredictDay[]): WeekPrediction {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const weeks: PredictDay[][] = [];
  for (let end = sorted.length; end > 0; end -= 7) weeks.unshift(sorted.slice(Math.max(0, end - 7), end));
  const summaries = weeks.map(summarise);

  const metrics: MetricPrediction[] = (Object.keys(SPEC) as MetricKey[]).map((key) => {
    const spec = SPEC[key];
    const series = summaries.map((s) => s[key]);
    const current = series.at(-1) ?? null;
    const raw = projectNext(series);
    const predicted = raw === null ? null : Math.min(spec.max, Math.max(spec.min, raw));
    const known = series.filter((v) => v !== null).length;
    let direction: MetricPrediction["direction"] = "steady";
    if (predicted !== null && current !== null) {
      const diff = predicted - current;
      if (Math.abs(diff) >= spec.steady(current)) direction = diff > 0 ? "up" : "down";
    }
    return {
      key,
      label: spec.label,
      weeks: series,
      current,
      predicted,
      direction,
      confidence: known >= 4 ? "high" : known >= 2 ? "medium" : "low",
    };
  });

  // Weekday patterns: completion rate per weekday, from days with plans.
  const planned = sorted.filter((d) => d.tasks_planned > 0);
  const byWeekday = new Map<string, number[]>();
  for (const d of planned) {
    const k = weekday(d.day);
    byWeekday.set(k, [...(byWeekday.get(k) ?? []), d.tasks_done / d.tasks_planned]);
  }
  const rates = [...byWeekday.entries()]
    .filter(([, r]) => r.length >= 2)
    .map(([weekday, r]) => ({ weekday, rate: avg(r) as number }))
    .sort((a, b) => b.rate - a.rate);
  const spread = rates.length >= 2 ? rates[0].rate - rates.at(-1)!.rate : 0;
  const bestDay = spread >= 0.15 ? rates[0] : null;
  const hardestDay = spread >= 0.15 ? rates.at(-1)! : null;

  // Suggested load: what actually gets done on a typical recent day.
  const recent = planned.slice(-14);
  const doneAvg = avg(recent.map((d) => d.tasks_done));
  const rateAvg = avg(recent.map((d) => d.tasks_done / d.tasks_planned));
  const suggestedPlansPerDay =
    recent.length >= 4 && doneAvg !== null && rateAvg !== null
      ? Math.max(1, Math.round(rateAvg < 0.6 ? doneAvg : doneAvg * 1.15))
      : null;

  // Sleep effect: completion on days after 7+ hours vs fewer.
  const slept = planned.filter((d) => d.sleep_hours !== null);
  const rested = slept.filter((d) => (d.sleep_hours as number) >= 7).map((d) => d.tasks_done / d.tasks_planned);
  const tired = slept.filter((d) => (d.sleep_hours as number) < 7).map((d) => d.tasks_done / d.tasks_planned);
  const sleepEffect =
    rested.length >= 2 && tired.length >= 2 ? { rested: avg(rested) as number, tired: avg(tired) as number } : null;

  // Risks: a metric that has slipped three weeks running.
  const risks = metrics
    .filter((m) => {
      const w = m.weeks.slice(-3);
      return w.length === 3 && w.every((v) => v !== null) && (w[0] as number) > (w[1] as number) && (w[1] as number) > (w[2] as number);
    })
    .map((m) => m.label);

  return {
    enoughData: sorted.filter((d) => d.tasks_planned > 0 || d.mood !== null || d.sleep_hours !== null).length >= 5,
    metrics,
    bestDay,
    hardestDay,
    suggestedPlansPerDay,
    sleepEffect,
    risks,
  };
}
