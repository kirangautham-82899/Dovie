"use client";

import type { QueryClient } from "@tanstack/react-query";
import { fetchTodayTasks } from "@/features/tasks/api";
import { fetchHabits } from "@/features/habits/api";
import { fetchFitnessGoals } from "@/features/fitness/api";
import { fetchCheckinState } from "@/features/checkin/api";
import { fetchWellness } from "@/features/wellness/api";
import { fetchMoney } from "@/features/money/api";
import { fetchGoals, fetchMovement } from "@/features/goals/api";
import { fetchJournal } from "@/features/journal/api";
import { calendarKey, fetchMonth } from "@/features/calendar/api";
import { fetchWeek } from "@/features/weekly/api";
import { fetchFitnessOverview } from "@/features/fitness/tracker/api";
import { fetchPlannerBlocks, fetchPlannerDay, plannerBlocksKey, plannerDayKey } from "@/features/planner/api";

// Warms a screen's data when its nav link is hovered, focused or touched, so
// it is usually ready by the time the click lands. Keys must match the hooks
// that read them; prefetchQuery skips anything already fresh.
const SCREENS: Record<string, (qc: QueryClient, today: string) => Promise<unknown>[]> = {
  "/today": (qc, today) => [
    qc.prefetchQuery({ queryKey: ["tasks", today], queryFn: () => fetchTodayTasks(today) }),
    qc.prefetchQuery({ queryKey: ["habits", today], queryFn: () => fetchHabits(today) }),
    qc.prefetchQuery({ queryKey: ["wellness", today], queryFn: () => fetchWellness(today) }),
    qc.prefetchQuery({ queryKey: ["checkin", today], queryFn: () => fetchCheckinState(today) }),
  ],
  "/goals": (qc, today) => [
    qc.prefetchQuery({ queryKey: ["goals"], queryFn: fetchGoals }),
    qc.prefetchQuery({ queryKey: ["habits", today], queryFn: () => fetchHabits(today) }),
    qc.prefetchQuery({ queryKey: ["fitness", today], queryFn: () => fetchFitnessGoals(today) }),
    qc.prefetchQuery({ queryKey: ["movement", today], queryFn: () => fetchMovement(today) }),
  ],
  "/planner": (qc, today) => [
    qc.prefetchQuery({ queryKey: plannerDayKey(today), queryFn: () => fetchPlannerDay(today, today) }),
    qc.prefetchQuery({ queryKey: plannerBlocksKey(today), queryFn: () => fetchPlannerBlocks(today) }),
  ],
  "/fitness": (qc, today) => [
    qc.prefetchQuery({ queryKey: ["fitness-tracker", today], queryFn: () => fetchFitnessOverview(today) }),
  ],
  "/money": (qc, today) => [qc.prefetchQuery({ queryKey: ["money", today], queryFn: () => fetchMoney(today) })],
  "/journal": (qc) => [qc.prefetchQuery({ queryKey: ["journal"], queryFn: fetchJournal })],
  "/wellness": (qc, today) => [qc.prefetchQuery({ queryKey: ["wellness", today], queryFn: () => fetchWellness(today) })],
  "/calendar": (qc, today) => [
    qc.prefetchQuery({ queryKey: calendarKey(today.slice(0, 7)), queryFn: () => fetchMonth(today.slice(0, 7)) }),
  ],
  "/weekly": (qc, today) => [qc.prefetchQuery({ queryKey: ["week", today], queryFn: () => fetchWeek(today) })],
};

export function prefetchScreen(qc: QueryClient, href: string, today: string | null) {
  if (!today) return;
  void Promise.allSettled(SCREENS[href]?.(qc, today) ?? []);
}

let warmed = false;

/**
 * Once per visit, when the browser is idle, load every screen's data so later
 * navigation is usually instant. Fresh data is skipped, so this is cheap.
 */
export function warmAllScreens(qc: QueryClient, today: string) {
  if (warmed) return () => {};
  const run = () => {
    warmed = true;
    for (const href of Object.keys(SCREENS)) prefetchScreen(qc, href, today);
  };
  // Safari has no requestIdleCallback; a short delay does the same job there.
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(run, 2000);
  return () => clearTimeout(id);
}
