import { PageHeader, PageShell } from "@/components/page-header";
import { PlannerView } from "@/components/views/planner-view";

export const metadata = { title: "Planner" };

export default function PlannerPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="day by day"
        title="Plan the days,"
        accent="tick them off."
        subtitle="Pick any day, jot down what you want to get done, and check each one off as you go."
      />
      <PlannerView />
    </PageShell>
  );
}
