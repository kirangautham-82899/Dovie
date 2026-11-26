"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdviceNote } from "@/components/advice-note";
import { Card } from "@/components/ui/card";
import { Slip } from "@/components/notebook";
import { ErrorNote } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { fetchFitnessOverview } from "./api";
import { useLiveWorkout } from "./live-store";
import { stopWorkout } from "./controls";
import { LiveView } from "./live-view";
import { FinishSheet, setReview, useReview } from "./finish-sheet";
import { setLiveMinimized, useLiveMinimized, usePendingSteps } from "./runtime";
import { StartPanel, TodayRings } from "./today-panels";
import { History, MixCard, RecordsCard, WeekChart, WeekNotes } from "./progress-cards";
import { BodyCard, StepCounterCard } from "./log-cards";

/** Header copy, shared with the loading skeleton so the page doesn't jump. */
export const FITNESS_HEADER = {
  eyebrow: "move, gently",
  title: "Move in your",
  accent: "own way.",
};

export function FitnessScreen({ today, profileId }: { today: string; profileId: string }) {
  const query = useQuery({ queryKey: ["fitness-tracker", today], queryFn: () => fetchFitnessOverview(today) });
  const live = useLiveWorkout();
  const minimized = useLiveMinimized();
  const review = useReview();
  const pending = usePendingSteps(today);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const data = query.data;
  const targets = data?.targets ?? null;

  return (
    <>
      <AdviceNote className="mb-4">
        Not medical advice. Distance, steps and calories are estimates from your phone&apos;s sensors; check with a doctor before starting
        new exercise if you have a health condition.
      </AdviceNote>
      {query.isError && (
        <div className="mb-4">
          <ErrorNote message={`Could not load your activity: ${query.error.message}`} onRetry={() => query.refetch()} />
        </div>
      )}

      {data && <WeekNotes data={data} today={today} pending={pending} />}

      <div className={cn("space-y-5", data && "mt-8")}>
        <Slip className="ruled lg:grid-cols-[1.1fr_1fr]">
          <TodayRings data={data} today={today} pending={pending} profileId={profileId} />
          <StartPanel
            today={today}
            targets={targets}
            disabled={live !== null || review !== null}
            onResume={() => setLiveMinimized(false)}
          />
        </Slip>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-5">
            <Slip>{data ? <WeekChart data={data} today={today} pending={pending} /> : <Card className="h-56 animate-pulse" />}</Slip>
            {data && (
              <Slip>
                <History data={data} today={today} onMessage={setToast} />
              </Slip>
            )}
          </div>
          <div className="min-w-0 space-y-5">
            <Slip>
              <StepCounterCard targets={targets} today={today} pending={pending} data={data} />
            </Slip>
            {data && (
              <>
                <Slip>
                  <RecordsCard data={data} />
                </Slip>
                <Slip>
                  <MixCard data={data} today={today} />
                </Slip>
                <Slip>
                  <BodyCard data={data} today={today} profileId={profileId} onMessage={setToast} />
                </Slip>
              </>
            )}
          </div>
        </div>
      </div>

      {live && !minimized && (
        <LiveView
          w={live}
          onFinish={() => {
            const summary = stopWorkout();
            if (summary) setReview(summary);
          }}
        />
      )}
      {review && !live && <FinishSheet w={review} onSaved={setToast} />}

      {toast && (
        <div role="status" className="animate-rise fixed inset-x-0 bottom-28 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-foreground px-5 py-2.5 text-sm text-background shadow-xl lg:bottom-8">
          {toast}
        </div>
      )}
    </>
  );
}
