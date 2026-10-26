import { PageShell } from "@/components/page-header";
import { WellnessView } from "@/components/views/wellness-view";

export const metadata = { title: "Wellness" };

export default function WellnessPage() {
  return (
    <PageShell>
      <WellnessView />
    </PageShell>
  );
}
