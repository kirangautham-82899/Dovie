import { PageHeader, PageShell } from "@/components/page-header";
import { WellnessView } from "@/components/views/wellness-view";

export const metadata = { title: "Wellness" };

export default function WellnessPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="your whole self"
        title="Care that fits"
        accent="real life."
        subtitle="A little sleep, a sip of water, a moment to move. Start where you are."
      />
      <WellnessView />
      <p className="mt-6 text-xs text-muted-foreground">Dovie is for tracking only and is not medical advice.</p>
    </PageShell>
  );
}
