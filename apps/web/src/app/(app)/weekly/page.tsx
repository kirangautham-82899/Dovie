import { PageShell } from "@/components/page-header";
import { WeeklyView } from "@/components/views/weekly-view";

export const metadata = { title: "Weekly review" };

export default function WeeklyPage() {
  return (
    <PageShell>
      <WeeklyView />
    </PageShell>
  );
}
