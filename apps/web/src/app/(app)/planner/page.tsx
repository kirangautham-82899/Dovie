import { PageShell } from "@/components/page-header";
import { PlannerView } from "@/components/views/planner-view";

export const metadata = { title: "Planner" };

export default function PlannerPage() {
  return (
    <PageShell>
      <header className="animate-rise mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-serif text-2xl leading-tight tracking-tight sm:text-3xl">
          Plan the days, <em className="text-rose pr-1">tick them off.</em>
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Top three first, then the rest, then give your hours a place.</p>
      </header>
      <PlannerView />
    </PageShell>
  );
}
