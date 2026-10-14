import { PageHeader, PageShell } from "@/components/page-header";
import { CalendarView } from "@/components/views/calendar-view";

export const metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="this week"
        title="The week, in"
        accent="soft focus."
        subtitle="Shape the days around you. Add a time block when you want to make space for something, not because the calendar needs filling."
      />
      <CalendarView />
    </PageShell>
  );
}
