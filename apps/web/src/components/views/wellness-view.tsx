"use client";

import { PageHeader } from "@/components/page-header";
import { Paper } from "@/components/notebook";
import { WellnessScreen } from "@/features/wellness/wellness-screen";
import { TodayGate, ViewSkeleton } from "./today-gate";

const HEADER = { eyebrow: "your whole self", title: "Care that fits", accent: "real life." };

export function WellnessView() {
  return (
    <TodayGate
      skeleton={
        <Paper>
          <PageHeader compact {...HEADER} />
          <ViewSkeleton />
        </Paper>
      }
    >
      {({ today }) => (
        <Paper>
          <PageHeader
            compact
            {...HEADER}
            subtitle={
              <span className="highlighter font-hand text-xl leading-snug text-foreground sm:text-2xl">
                A little sleep, a sip of water, a moment to move. Start where you are.
              </span>
            }
          />
          <WellnessScreen today={today} />
          <p className="mt-10 text-xs text-muted-foreground">Dovie is for tracking only and is not medical advice.</p>
        </Paper>
      )}
    </TodayGate>
  );
}
