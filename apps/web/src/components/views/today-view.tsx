"use client";

import Link from "next/link";
import { BookHeart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/page-header";
import type { Profile } from "@/features/settings/api";
import { TasksSection } from "@/features/tasks/tasks-section";
import { HabitsToday } from "@/features/habits/habits-today";
import { FitnessToday } from "@/features/fitness/fitness-today";
import { CheckinCard } from "@/features/checkin/checkin-card";
import { WellnessToday } from "@/features/wellness/wellness-today";
import { BillsToday } from "@/features/money/bills-today";
import { TodayGlance } from "@/features/today/today-glance";
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
        <>
          <PageHeader eyebrow="today" title="A little at a" accent="time." />
          <ViewSkeleton />
        </>
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
          <>
            <PageHeader
              eyebrow={date}
              title={`${greeting(profile.timezone)},`}
              accent={`${firstName ?? "friend"}.`}
              subtitle="You don't have to do it all. Just begin somewhere."
            />
            <TodayGlance today={today} />
            <div className="ruled lg:grid-cols-[1.25fr_1fr]">
              <div className="divide-y">
                {has("tasks") && <TasksSection today={today} />}
                {has("habits") && <HabitsToday today={today} />}
                {has("fitness") && <FitnessToday today={today} />}
              </div>
              <div className="divide-y">
                {(has("wellness") || has("fitness")) && <WellnessToday today={today} />}
                {has("money") && <BillsToday today={today} />}
                {has("journal") && (
                  <Card className="border-t-2 border-t-chart-3">
                    <SectionTitle icon={BookHeart} title="A moment for you" />
                    <p className="text-sm text-muted-foreground">A sentence is plenty. It stays private and encrypted.</p>
                    <Link
                      href="/journal"
                      className="inline-flex w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Open your journal →
                    </Link>
                  </Card>
                )}
                <CheckinCard today={today} />
              </div>
            </div>
          </>
        );
      }}
    </TodayGate>
  );
}
