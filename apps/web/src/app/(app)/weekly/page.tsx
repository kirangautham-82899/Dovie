import { PageHeader, PageShell } from "@/components/page-header";
import { WeeklyView } from "@/components/views/weekly-view";

export const metadata = { title: "Weekly review" };

export default function WeeklyPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="a gentle look back"
        title="Your week, with"
        accent="kindness."
        subtitle="A mirror, not a report card. The last seven days, from your plans, habits and check-ins."
      />
      <WeeklyView />
    </PageShell>
  );
}
