// Money forecasting from the user's own entries. Pure functions with no
// imports, so scripts/forecast-test.mjs can run them directly in Node.
//
// Method, in plain terms:
// - Daily pace this month = spent so far / days elapsed.
// - Early in the month that pace is noisy, so it is blended with the daily
//   average of the previous 90 days, weighted by how far into the month we are.
// - The month-end figure is spent so far + blended pace x days left. The range
//   is an ~80% band from the day-to-day spread of spending (sigma x sqrt(days)).
// - Each category is projected the same way and compared with its budget.
// - Savings goals extrapolate the average saving rate since the goal began.

export type ForecastExpense = { amount_paise: number; category: string; spent_on: string };
export type ForecastBill = { amount_paise: number | null; due_date: string };
export type ForecastBudget = { category: string; monthly_limit_paise: number };
export type ForecastGoal = {
  id: string;
  title: string;
  target_paise: number;
  saved_paise: number;
  target_date: string | null;
  created_at: string;
};

export type CategoryForecast = {
  category: string;
  spent: number;
  projected: number;
  limit: number | null;
  status: "on-track" | "tight" | "over" | "no-budget";
};

export type GoalForecast = {
  id: string;
  title: string;
  remaining: number;
  /** Projected completion date, or null with no saving history yet. */
  eta: string | null;
  /** Amount per month needed to hit the target date, if one is set. */
  neededPerMonth: number | null;
  status: "done" | "on-track" | "behind" | "no-data";
};

export type MoneyForecast = {
  monthEnd: string;
  daysInMonth: number;
  dayOfMonth: number;
  daysLeft: number;
  spentSoFar: number;
  projected: number;
  low: number;
  high: number;
  dailyPace: number;
  historicalDaily: number | null;
  lastMonthTotal: number | null;
  billsDueThisMonth: number;
  confidence: "low" | "medium" | "high";
  categories: CategoryForecast[];
  goals: GoalForecast[];
  /** Cumulative spending by day: actual up to today, projected after. */
  series: { day: number; actual: number | null; projected: number | null }[];
};

const DAY = 86_400_000;
const Z80 = 1.2816; // two-sided 80% interval

function parse(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

function iso(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(date: string, n: number) {
  return iso(parse(date) + n * DAY);
}

function daysBetween(a: string, b: string) {
  return Math.round((parse(b) - parse(a)) / DAY);
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
}

function dailyTotals(expenses: ForecastExpense[], from: string, days: number) {
  const totals = new Array<number>(Math.max(0, days)).fill(0);
  for (const e of expenses) {
    const i = daysBetween(from, e.spent_on);
    if (i >= 0 && i < days) totals[i] += e.amount_paise;
  }
  return totals;
}

/**
 * @param today     the user's local date (YYYY-MM-DD)
 * @param month     this month's expenses up to today
 * @param history   expenses from the 90 days before this month began
 */
export function forecastMoney(input: {
  today: string;
  month: ForecastExpense[];
  history: ForecastExpense[];
  bills: ForecastBill[];
  budgets: ForecastBudget[];
  goals: ForecastGoal[];
}): MoneyForecast {
  const { today, month, history, bills, budgets, goals } = input;
  const monthStart = `${today.slice(0, 7)}-01`;
  const [y, m] = today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthEnd = `${today.slice(0, 7)}-${String(daysInMonth).padStart(2, "0")}`;
  const dayOfMonth = Number(today.slice(8, 10));
  const daysLeft = daysInMonth - dayOfMonth;
  const progress = dayOfMonth / daysInMonth;

  const spentSoFar = month.reduce((s, e) => s + e.amount_paise, 0);
  const dailyPace = spentSoFar / dayOfMonth;

  // History only counts from the first recorded expense, so a new user's
  // empty past doesn't drag the forecast toward zero.
  const historyStart = history.reduce((min, e) => (e.spent_on < min ? e.spent_on : min), monthStart);
  const historyDays = daysBetween(historyStart, monthStart);
  const historyTotal = history.reduce((s, e) => s + e.amount_paise, 0);
  const historicalDaily = historyDays >= 14 ? historyTotal / historyDays : null;

  const blend = (current: number, past: number | null) =>
    past === null ? current : progress * current + (1 - progress) * past;
  const pace = blend(dailyPace, historicalDaily);
  const projected = Math.round(spentSoFar + pace * daysLeft);

  const spread = stdDev([
    ...dailyTotals(history, historyStart, historyDays),
    ...dailyTotals(month, monthStart, dayOfMonth),
  ]);
  const margin = Z80 * spread * Math.sqrt(daysLeft);
  const low = Math.round(Math.max(spentSoFar, projected - margin));
  const high = Math.round(projected + margin);

  const lastMonthStart = iso(Date.UTC(y, m - 2, 1));
  const lastMonthTotal =
    historyStart <= lastMonthStart
      ? history.filter((e) => e.spent_on >= lastMonthStart && e.spent_on < monthStart).reduce((s, e) => s + e.amount_paise, 0)
      : null;

  const billsDueThisMonth = bills
    .filter((b) => b.due_date <= monthEnd)
    .reduce((s, b) => s + (b.amount_paise ?? 0), 0);

  // Categories: everything with spending or a budget.
  const names = new Set([...month.map((e) => e.category), ...budgets.map((b) => b.category)]);
  const categories: CategoryForecast[] = [...names].map((category) => {
    const spent = month.filter((e) => e.category === category).reduce((s, e) => s + e.amount_paise, 0);
    const pastDaily =
      historicalDaily === null
        ? null
        : history.filter((e) => e.category === category).reduce((s, e) => s + e.amount_paise, 0) / historyDays;
    const proj = Math.round(spent + blend(spent / dayOfMonth, pastDaily) * daysLeft);
    const limit = budgets.find((b) => b.category === category)?.monthly_limit_paise ?? null;
    const status: CategoryForecast["status"] =
      limit === null ? "no-budget" : proj > limit ? "over" : proj > limit * 0.85 ? "tight" : "on-track";
    return { category, spent, projected: proj, limit, status };
  });
  const order = { over: 0, tight: 1, "on-track": 2, "no-budget": 3 };
  categories.sort((a, b) => order[a.status] - order[b.status] || b.projected - a.projected);

  const goalForecasts: GoalForecast[] = goals.map((g) => {
    const remaining = Math.max(0, g.target_paise - g.saved_paise);
    const neededPerMonth =
      g.target_date && remaining > 0
        ? Math.round(remaining / Math.max(1, daysBetween(today, g.target_date) / 30.44))
        : null;
    if (remaining === 0) return { id: g.id, title: g.title, remaining, eta: today, neededPerMonth: null, status: "done" };
    const age = Math.max(1, daysBetween(g.created_at.slice(0, 10), today));
    const perDay = g.saved_paise / age;
    if (perDay <= 0) return { id: g.id, title: g.title, remaining, eta: null, neededPerMonth, status: "no-data" };
    const eta = addDays(today, Math.ceil(remaining / perDay));
    const status = g.target_date && eta > g.target_date ? "behind" : "on-track";
    return { id: g.id, title: g.title, remaining, eta, neededPerMonth, status };
  });

  const byDay = dailyTotals(month, monthStart, dayOfMonth);
  const series: MoneyForecast["series"] = [];
  let running = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (d <= dayOfMonth) running += byDay[d - 1];
    series.push({
      day: d,
      actual: d <= dayOfMonth ? running : null,
      projected: d >= dayOfMonth ? Math.round(spentSoFar + pace * (d - dayOfMonth)) : null,
    });
  }

  const confidence: MoneyForecast["confidence"] =
    historicalDaily !== null && dayOfMonth >= 10 ? "high" : historicalDaily !== null || dayOfMonth >= 15 ? "medium" : "low";

  return {
    monthEnd,
    daysInMonth,
    dayOfMonth,
    daysLeft,
    spentSoFar,
    projected,
    low,
    high,
    dailyPace: Math.round(pace),
    historicalDaily: historicalDaily === null ? null : Math.round(historicalDaily),
    lastMonthTotal,
    billsDueThisMonth,
    confidence,
    categories,
    goals: goalForecasts,
    series,
  };
}
