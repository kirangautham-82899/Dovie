// Turns stored sessions and step totals into the numbers the screen shows.

import { addDays } from "@/lib/dates";
import { DEFAULT_WEIGHT_KG, paceOf } from "./engine";
import type { FitnessOverview, Session } from "./api";

export type DayTotals = {
  date: string;
  steps: number;
  distanceM: number;
  activeMin: number;
  kcal: number;
  sessions: number;
};

/** Roughly 0.04 kcal per step for a 70 kg walker, scaled by weight. */
const kcalPerStep = (weightKg: number) => 0.04 * (weightKg / 70);

export function dayTotals(data: FitnessOverview, date: string, pendingSteps = 0): DayTotals {
  const weight = data.targets.weight_kg ?? DEFAULT_WEIGHT_KG;
  const day = data.days.find((d) => d.activity_date === date);
  const sessions = data.sessions.filter((s) => s.session_date === date);
  const allDaySteps = (day?.steps ?? 0) + pendingSteps;
  return {
    date,
    steps: allDaySteps + sessions.reduce((s, x) => s + x.steps, 0),
    distanceM: (day?.distance_m ?? 0) + sessions.reduce((s, x) => s + x.distance_m, 0),
    activeMin: Math.round(((day?.active_seconds ?? 0) + sessions.reduce((s, x) => s + x.duration_s, 0)) / 60),
    kcal: Math.round(allDaySteps * kcalPerStep(weight) + sessions.reduce((s, x) => s + x.calories, 0)),
    sessions: sessions.length,
  };
}

export function weekTotals(data: FitnessOverview, today: string, pendingSteps: number): DayTotals[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return dayTotals(data, date, date === today ? pendingSteps : 0);
  });
}

/** Consecutive days (ending today or yesterday) with a workout or 10+ active minutes. */
export function activeStreak(data: FitnessOverview, today: string, pendingSteps: number): number {
  const active = (d: string) => {
    const t = dayTotals(data, d, d === today ? pendingSteps : 0);
    return t.sessions > 0 || t.activeMin >= 10;
  };
  let day = active(today) ? today : addDays(today, -1);
  let streak = 0;
  while (streak < 120 && active(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export type Records = {
  longestDistance: Session | null;
  longestTime: Session | null;
  bestPace: { session: Session; pace: number } | null;
  mostCalories: Session | null;
  bestStepsDay: { date: string; steps: number } | null;
};

export function personalRecords(data: FitnessOverview): Records {
  const by = (score: (s: Session) => number) =>
    data.sessions.reduce<Session | null>((best, s) => (score(s) > 0 && (!best || score(s) > score(best)) ? s : best), null);

  let bestPace: Records["bestPace"] = null;
  for (const s of data.sessions) {
    if (s.activity !== "run" && s.activity !== "walk") continue;
    if (s.distance_m < 1000) continue;
    const pace = paceOf(s.distance_m, s.duration_s);
    if (pace && (!bestPace || pace < bestPace.pace)) bestPace = { session: s, pace };
  }

  const dates = new Set([...data.days.map((d) => d.activity_date), ...data.sessions.map((s) => s.session_date)]);
  let bestStepsDay: Records["bestStepsDay"] = null;
  for (const d of dates) {
    const steps = dayTotals(data, d).steps;
    if (steps > 0 && (!bestStepsDay || steps > bestStepsDay.steps)) bestStepsDay = { date: d, steps };
  }

  return {
    longestDistance: by((s) => s.distance_m),
    longestTime: by((s) => s.duration_s),
    bestPace,
    mostCalories: by((s) => s.calories),
    bestStepsDay,
  };
}

/** Per-activity totals for the last 30 days, biggest first. */
export function activityMix(data: FitnessOverview, today: string) {
  const from = addDays(today, -29);
  const mix = new Map<string, { minutes: number; count: number }>();
  for (const s of data.sessions) {
    if (s.session_date < from) continue;
    const m = mix.get(s.activity) ?? { minutes: 0, count: 0 };
    m.minutes += s.duration_s / 60;
    m.count++;
    mix.set(s.activity, m);
  }
  return [...mix.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.minutes - a.minutes);
}
