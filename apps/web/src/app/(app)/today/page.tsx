import { PageShell } from "@/components/page-header";
import { TodayView } from "@/components/views/today-view";

export const metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <PageShell>
      <TodayView />
    </PageShell>
  );
}
