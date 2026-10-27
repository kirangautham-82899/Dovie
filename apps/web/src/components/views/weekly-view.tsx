"use client";

import { PageHeader } from "@/components/page-header";
import { Paper } from "@/components/notebook";
import { WEEKLY_HEADER, WeeklySummary } from "@/features/weekly/weekly-summary";
import { TodayGate, ViewSkeleton } from "./today-gate";

/** The weekly review shares Today's dot-grid notebook page. */
export function WeeklyView() {
  return (
    <TodayGate
      skeleton={
        <Paper>
          <PageHeader compact {...WEEKLY_HEADER} />
          <ViewSkeleton />
        </Paper>
      }
    >
      {({ today }) => (
        <Paper>
          <WeeklySummary today={today} />
        </Paper>
      )}
    </TodayGate>
  );
}
