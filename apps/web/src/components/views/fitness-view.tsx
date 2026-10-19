"use client";

import { PageHeader } from "@/components/page-header";
import { Paper } from "@/components/notebook";
import { FITNESS_HEADER, FitnessScreen } from "@/features/fitness/tracker/fitness-screen";
import { TodayGate, ViewSkeleton } from "./today-gate";

/** Fitness shares the dot-grid notebook page with Today and Money. */
export function FitnessView() {
  return (
    <TodayGate
      skeleton={
        <Paper>
          <PageHeader compact {...FITNESS_HEADER} />
          <ViewSkeleton />
        </Paper>
      }
    >
      {({ profile, today }) => (
        <Paper>
          <PageHeader compact {...FITNESS_HEADER} />
          <FitnessScreen today={today} profileId={profile.id} />
        </Paper>
      )}
    </TodayGate>
  );
}
