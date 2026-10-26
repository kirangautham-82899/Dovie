import { addDays, daysBetween } from "@/lib/dates";

export type CycleLog = { log_date: string; flow: number | null; symptoms: string[] };

export const FLOWS = [
  { value: 1, label: "Light" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Heavy" },
] as const;

export const SYMPTOMS = ["Cramps", "Headache", "Bloating", "Tired", "Mood swings", "Cravings", "Backache", "Acne"] as const;

export const DEFAULT_CYCLE_DAYS = 28;
export const DEFAULT_PERIOD_DAYS = 5;

export type Period = { start: string; end: string };

/** Runs of days with bleeding. One day of spotting between two bleeding days does not split a period. */
export function periodsFrom(logs: CycleLog[]): Period[] {
  const days = logs
    .filter((l) => l.flow !== null)
    .map((l) => l.log_date)
    .sort();
  const periods: Period[] = [];
  for (const day of days) {
    const last = periods[periods.length - 1];
    if (last && daysBetween(last.end, day) <= 2) last.end = day;
    else periods.push({ start: day, end: day });
  }
  return periods;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export type CycleSummary = {
  periods: Period[];
  /** Typical days from one period start to the next, from the last few cycles (28 until there are two periods). */
  cycleDays: number;
  /** Typical days of bleeding. */
  periodDays: number;
  /** How many full cycles the typical length is based on. */
  cyclesCounted: number;
  /** Day of the current cycle, counting the first day of bleeding as 1. Null before any period is logged. */
  cycleDay: number | null;
  /** Bleeding is logged for today. */
  bleedingToday: boolean;
  /** Day count within a period that includes today, otherwise null. */
  periodDay: number | null;
  nextStart: string | null;
  /** Days until the expected start; negative once it is overdue. */
  daysUntil: number | null;
  /** The days the next period is expected to cover. */
  expected: string[];
};

/** What the logs say about the cycle. These are estimates from what was entered, not medical advice. */
export function summarize(logs: CycleLog[], today: string): CycleSummary {
  const periods = periodsFrom(logs);
  const starts = periods.map((p) => p.start);
  const gaps = starts
    .slice(1)
    .map((s, i) => daysBetween(starts[i], s))
    .filter((n) => n >= 15 && n <= 60)
    .slice(-6);
  const cycleDays = gaps.length ? Math.round(mean(gaps)) : DEFAULT_CYCLE_DAYS;
  const lengths = periods.slice(-6).map((p) => daysBetween(p.start, p.end) + 1);
  const periodDays = lengths.length ? Math.round(mean(lengths)) : DEFAULT_PERIOD_DAYS;

  const last = periods[periods.length - 1];
  const sinceStart = last ? daysBetween(last.start, today) : null;
  const cycleDay = sinceStart !== null && sinceStart >= 0 ? sinceStart + 1 : null;
  const bleedingToday = logs.some((l) => l.log_date === today && l.flow !== null);
  const periodDay = last && bleedingToday && cycleDay !== null ? cycleDay : null;

  const nextStart = last ? addDays(last.start, cycleDays) : null;
  return {
    periods,
    cycleDays,
    periodDays,
    cyclesCounted: gaps.length,
    cycleDay,
    bleedingToday,
    periodDay,
    nextStart,
    daysUntil: nextStart ? daysBetween(today, nextStart) : null,
    expected: nextStart ? Array.from({ length: periodDays }, (_, i) => addDays(nextStart, i)) : [],
  };
}

/** The Monday on or before a YYYY-MM-DD date. */
export function mondayOf(date: string): string {
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}
