"use client";

import { JournalScreen } from "@/features/journal/journal-screen";
import { TodayGate, ViewSkeleton } from "./today-gate";

export function JournalView() {
  return <TodayGate skeleton={<ViewSkeleton />}>{({ today }) => <JournalScreen today={today} />}</TodayGate>;
}
