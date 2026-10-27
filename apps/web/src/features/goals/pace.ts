import { addDays, daysBetween } from "@/lib/dates";
import type { Goal, GoalLog } from "./api";

export type PaceStatus = "done" | "ahead" | "on-track" | "behind" | "overdue" | "open";

export const PACE: Record<PaceStatus, { label: string; className: string }> = {
  done: { label: "Reached", className: "bg-mint text-mint-foreground" },
  ahead: { label: "Ahead", className: "bg-sky text-sky-foreground" },
  "on-track": { label: "On track", className: "bg-secondary text-secondary-foreground" },
  behind: { label: "A little behind", className: "bg-butter text-butter-foreground" },
  overdue: { label: "Past its date", className: "bg-muted text-muted-foreground" },
  open: { label: "Open-ended", className: "bg-muted text-muted-foreground" },
};

export function ratio(g: Goal) {
  return g.target_value ? Math.min(1, g.current_value / g.target_value) : null;
}

export function isDone(g: Goal) {
  return !!g.completed_at || (!!g.target_value && g.current_value >= g.target_value);
}

export type Pace = {
  status: PaceStatus;
  /** Days until the target date (negative once it has passed). */
  daysLeft: number | null;
  /** How much a week it takes from here to land on the date. */
  perWeekNeeded: number | null;
  /** When the goal lands at the last four weeks' rate. */
  eta: string | null;
};

/** Where a goal stands against its date, and when it lands at the recent rate. */
export function pace(g: Goal, logs: GoalLog[], today: string): Pace {
  const remaining = g.target_value ? Math.max(0, g.target_value - g.current_value) : null;
  const recent = logs.filter((l) => l.goal_id === g.id && daysBetween(l.log_date, today) < 28).reduce((s, l) => s + l.amount, 0);
  const perDay = recent > 0 ? recent / 28 : 0;
  const eta = remaining && perDay > 0 ? addDays(today, Math.ceil(remaining / perDay)) : null;
  const daysLeft = g.target_date ? daysBetween(today, g.target_date) : null;

  if (isDone(g)) return { status: "done", daysLeft, perWeekNeeded: null, eta: null };
  if (!g.target_value || !g.target_date || daysLeft === null) return { status: "open", daysLeft, perWeekNeeded: null, eta };
  if (daysLeft < 0) return { status: "overdue", daysLeft, perWeekNeeded: null, eta };

  const start = g.created_at.slice(0, 10);
  const span = Math.max(1, daysBetween(start, g.target_date));
  const expected = g.target_value * Math.min(1, Math.max(0, daysBetween(start, today)) / span);
  const perWeekNeeded = remaining! / Math.max(1, daysLeft / 7);
  // A brand-new goal is on track by definition; give it a few days before judging.
  const score = expected < g.target_value * 0.05 ? 1 : g.current_value / expected;
  const status = score >= 1.1 ? "ahead" : score >= 0.85 ? "on-track" : "behind";
  return { status, daysLeft, perWeekNeeded, eta };
}

/** Amount logged per day over the last `days` days for one goal (oldest first). */
export function spark(goalId: string, logs: GoalLog[], today: string, days = 14) {
  const byDay = new Map<string, number>();
  for (const l of logs) if (l.goal_id === goalId && l.amount > 0) byDay.set(l.log_date, (byDay.get(l.log_date) ?? 0) + l.amount);
  return Array.from({ length: days }, (_, i) => byDay.get(addDays(today, i - days + 1)) ?? 0);
}

/** Days in a row with at least one step, counting back from today (or yesterday, so today isn't a break yet). */
export function streaks(logs: GoalLog[], today: string) {
  const days = new Set(logs.filter((l) => l.amount > 0).map((l) => l.log_date));
  let current = 0;
  for (let d = days.has(today) ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) current++;
  let best = 0;
  let run = 0;
  for (const d of [...days].sort()) {
    run = days.has(addDays(d, -1)) ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best, loggedToday: days.has(today) };
}

/** The milestone percentage a step just crossed, if any. */
export function crossed(before: number, after: number) {
  return [100, 75, 50, 25].find((p) => before * 100 < p && after * 100 >= p) ?? null;
}
