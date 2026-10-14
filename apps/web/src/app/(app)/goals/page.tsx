import { PageHeader, PageShell } from "@/components/page-header";
import { GoalsView } from "@/components/views/goals-view";

export const metadata = { title: "Goals" };

export default function GoalsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="small steps, real growth"
        title="Things you're"
        accent="growing."
        subtitle="A goal can be a direction, not a deadline. Set things up here, then log them in one tap from Today."
      />
      <GoalsView />
    </PageShell>
  );
}
