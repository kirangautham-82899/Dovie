import { Suspense } from "react";
import { getProfileAndToday } from "@/lib/profile";
import { FOCUS_AREAS, type FocusAreaId } from "@/lib/focus-areas";
import { TasksSection } from "@/features/tasks/tasks-section";
import { HabitsToday } from "@/features/habits/habits-today";
import { FitnessToday } from "@/features/fitness/fitness-today";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder cards for areas that are not built yet.
const PLACEHOLDERS: Partial<Record<FocusAreaId, string>> = {
  money: "Bills due",
  journal: "Journal",
};

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayShell title="Today" subtitle="Loading your day..." />}>
      <TodayContent />
    </Suspense>
  );
}

async function TodayContent() {
  const { profile, today } = await getProfileAndToday();

  const firstName = profile.display_name?.trim().split(/\s+/)[0];
  const date = new Date().toLocaleDateString("en-IN", {
    timeZone: profile.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const areas = FOCUS_AREAS.map((a) => a.id).filter((id) => profile.focus_areas.includes(id));

  return (
    <TodayShell title={firstName ? `Hi, ${firstName}` : "Today"} subtitle={date}>
      {areas.includes("tasks") && <TasksSection today={today} />}
      {areas.includes("habits") && <HabitsToday today={today} />}
      {areas.includes("fitness") && <FitnessToday today={today} />}
      {areas.map((id) => {
        const title = PLACEHOLDERS[id];
        return title ? (
          <Card key={id}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Coming soon</CardContent>
          </Card>
        ) : null;
      })}
    </TodayShell>
  );
}

function TodayShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </main>
  );
}
