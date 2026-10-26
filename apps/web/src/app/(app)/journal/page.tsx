import { PageShell } from "@/components/page-header";
import { JournalView } from "@/components/views/journal-view";

export const metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <PageShell>
      <header className="animate-rise mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-serif text-2xl leading-tight tracking-tight sm:text-3xl">
          Write it <em className="text-rose pr-1">down.</em>
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">A page for whatever you feel. Never used for insights.</p>
      </header>
      <JournalView />
    </PageShell>
  );
}
