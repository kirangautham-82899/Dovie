"use client";

import Link from "next/link";
import { BookHeart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { Paper, Slip } from "@/components/notebook";
import type { Profile } from "@/features/settings/api";
import { TasksSection } from "@/features/tasks/tasks-section";
import { FitnessToday } from "@/features/fitness/fitness-today";
import { CheckinCard } from "@/features/checkin/checkin-card";
import { WellnessToday } from "@/features/wellness/wellness-today";
import { BillsToday } from "@/features/money/bills-today";
import { TodayGlance } from "@/features/today/today-glance";
import { QuickNotes } from "@/features/today/quick-notes";
import { dailyMessage } from "@/features/today/daily-message";
import { TodayGate, ViewSkeleton } from "./today-gate";

function greeting(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TodayView() {
  return (
    <TodayGate
      skeleton={
        <Paper>
          <PageHeader compact eyebrow="today" title="A little at a" accent="time." />
          <ViewSkeleton />
        </Paper>
      }
    >
      {({ profile, today }) => {
        const has = (id: string) => profile.focus_areas.includes(id as Profile["focus_areas"][number]);
        const firstName = profile.display_name?.trim().split(/\s+/)[0];
        const date = new Date().toLocaleDateString("en-IN", {
          timeZone: profile.timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        return (
          <Paper>
            <PageHeader
              compact
              eyebrow={date}
              title={`${greeting(profile.timezone)},`}
              accent={`${firstName ?? "friend"}.`}
              subtitle={<span className="highlighter font-hand text-xl leading-snug text-foreground sm:text-2xl">{dailyMessage(today)}</span>}
            />
            <TodayGlance today={today} />
            <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
              <div className="min-w-0">{has("tasks") && <TasksSection today={today} />}</div>
              <QuickNotes />
            </div>
            <div className="mt-10 grid items-start gap-8 md:grid-cols-2 lg:gap-10">
              {(has("wellness") || has("fitness")) && (
                <Slip>
                  <WellnessToday today={today} />
                </Slip>
              )}
              <Slip>
                <CheckinCard today={today} />
              </Slip>
            </div>
            {(has("fitness") || has("money") || has("journal")) && (
              <div className="mt-10 grid items-start gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
                {has("fitness") && (
                  <Slip>
                    <FitnessToday today={today} />
                  </Slip>
                )}
                {has("money") && (
                  <Slip>
                    <BillsToday today={today} />
                  </Slip>
                )}
                {has("journal") && (
                  <Slip>
                    <Card>
                      <SectionTitle icon={BookHeart} title="A moment for you" />
                      <p className="text-sm text-muted-foreground">A sentence is plenty. It stays private and encrypted.</p>
                      <Link
                        href="/journal"
                        className="inline-flex w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        Open your journal →
                      </Link>
                    </Card>
                  </Slip>
                )}
              </div>
            )}
          </Paper>
        );
      }}
    </TodayGate>
  );
}
