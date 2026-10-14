"use client";

import { WeekPlanner } from "@/features/calendar/week-planner";
import { TodayGate } from "./today-gate";

export function CalendarView() {
  return <TodayGate>{({ today }) => <WeekPlanner today={today} />}</TodayGate>;
}
