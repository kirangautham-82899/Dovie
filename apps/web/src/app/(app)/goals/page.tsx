import { PageShell } from "@/components/page-header";
import { GoalsView } from "@/components/views/goals-view";

export const metadata = { title: "Goals" };

export default function GoalsPage() {
  return (
    <PageShell>
      <GoalsView />
    </PageShell>
  );
}
