import { PageHeader, PageShell } from "@/components/page-header";
import { FitnessView } from "@/components/views/fitness-view";

export const metadata = { title: "Fitness" };

export default function FitnessPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="live fitness tracker"
        title="Move in your"
        accent="own way."
        subtitle="Start a walk, run, ride or session and Dovie records it live: time, distance, pace, route, steps, calories and heart rate."
      />
      <FitnessView />
    </PageShell>
  );
}
