"use client";

import { PageHeader } from "@/components/page-header";
import { Paper } from "@/components/notebook";
import { MoneyBoard, MONEY_HEADER } from "@/features/money/money-board";
import { TodayGate, ViewSkeleton } from "./today-gate";

/** Money shares Today's dot-grid notebook page. */
export function MoneyView() {
  return (
    <TodayGate
      skeleton={
        <Paper>
          <PageHeader compact {...MONEY_HEADER} />
          <ViewSkeleton />
        </Paper>
      }
    >
      {({ today }) => (
        <Paper>
          <MoneyBoard today={today} />
        </Paper>
      )}
    </TodayGate>
  );
}
