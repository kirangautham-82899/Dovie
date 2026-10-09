import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FOCUS_AREAS, type FocusAreaId } from "@/lib/focus-areas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Cards shown for each focus area the user picked during onboarding.
const SECTIONS: Record<FocusAreaId, string[]> = {
  tasks: ["Top 3 priorities", "To-dos"],
  habits: ["Habits"],
  fitness: ["Fitness goal"],
  money: ["Bills due"],
  journal: ["Journal"],
};

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayShell title="Today" subtitle="Loading your day..." />}>
      <TodayContent />
    </Suspense>
  );
}

async function TodayContent() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, focus_areas, timezone, onboarded_at")
    .single();

  if (!profile?.onboarded_at) redirect("/onboarding");

  const firstName = profile.display_name?.trim().split(/\s+/)[0];
  const date = new Date().toLocaleDateString("en-IN", {
    timeZone: profile.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const areas = FOCUS_AREAS.map((a) => a.id).filter((id) => profile.focus_areas.includes(id));
  const cards = areas.flatMap((id) => SECTIONS[id]);

  return (
    <TodayShell title={firstName ? `Hi, ${firstName}` : "Today"} subtitle={date}>
      {cards.map((title) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Coming soon</CardContent>
        </Card>
      ))}
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
