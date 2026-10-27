"use client";

import { PageHeader } from "@/components/page-header";
import { Paper } from "@/components/notebook";
import { CALENDAR_HEADER, MonthCalendar } from "@/features/calendar/month-calendar";
import { TodayGate, ViewSkeleton } from "./today-gate";

/** Calendar shares Today's dot-grid notebook page. */
export function CalendarView() {
  return (
    <TodayGate
      skeleton={
        <Paper>
          <PageHeader compact {...CALENDAR_HEADER} />
          <ViewSkeleton />
        </Paper>
      }
    >
      {({ today }) => (
        <Paper>
          <MonthCalendar today={today} />
        </Paper>
      )}
    </TodayGate>
  );
}
