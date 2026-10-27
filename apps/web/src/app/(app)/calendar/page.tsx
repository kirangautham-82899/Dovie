import { PageShell } from "@/components/page-header";
import { CalendarView } from "@/components/views/calendar-view";

export const metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <PageShell>
      <CalendarView />
    </PageShell>
  );
}
