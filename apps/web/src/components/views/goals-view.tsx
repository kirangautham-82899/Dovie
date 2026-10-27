"use client";

import { PageHeader } from "@/components/page-header";
import { Paper, Slip } from "@/components/notebook";
import { GOALS_HEADER, GoalsNotebook } from "@/features/goals/goals-notebook";
import { MovementLog } from "@/features/goals/movement-log";
import { HabitsManager } from "@/features/habits/habits-manager";
import { HabitsToday } from "@/features/habits/habits-today";
import { FitnessManager } from "@/features/fitness/fitness-manager";
import { TodayGate, ViewSkeleton } from "./today-gate";

/** Goals shares Today's dot-grid notebook page; habits and movement sit below as slips. */
export function GoalsView() {
  return (
    <TodayGate
      skeleton={
        <Paper>
          <PageHeader compact {...GOALS_HEADER} />
          <ViewSkeleton />
        </Paper>
      }
    >
      {({ today }) => (
        <Paper>
          <GoalsNotebook today={today} />
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
            <Slip className="divide-y">
              <HabitsToday today={today} />
              <HabitsManager today={today} />
            </Slip>
            <Slip className="divide-y">
              <FitnessManager today={today} />
              <MovementLog today={today} />
            </Slip>
          </div>
        </Paper>
      )}
    </TodayGate>
  );
}
