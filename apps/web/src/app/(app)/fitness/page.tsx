import { PageShell } from "@/components/page-header";
import { FitnessView } from "@/components/views/fitness-view";

export const metadata = { title: "Fitness" };

export default function FitnessPage() {
  return (
    <PageShell>
      <FitnessView />
    </PageShell>
  );
}
