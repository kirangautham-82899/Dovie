import { PageShell } from "@/components/page-header";
import { MoneyView } from "@/components/views/money-view";

export const metadata = { title: "Money" };

export default function MoneyPage() {
  return (
    <PageShell>
      <MoneyView />
    </PageShell>
  );
}
