import { PageHeader, PageShell } from "@/components/page-header";
import { JournalView } from "@/components/views/journal-view";

export const metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="a page just for you"
        title="Put it somewhere"
        accent="safe."
        subtitle="Your words are encrypted in this browser before they leave your device. Journal text is never used for insights."
      />
      <JournalView />
    </PageShell>
  );
}
