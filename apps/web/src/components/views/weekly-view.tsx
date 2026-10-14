"use client";

import { WeeklySummary } from "@/features/weekly/weekly-summary";
import { TodayGate } from "./today-gate";

export function WeeklyView() {
  return <TodayGate>{({ today }) => <WeeklySummary today={today} />}</TodayGate>;
}
