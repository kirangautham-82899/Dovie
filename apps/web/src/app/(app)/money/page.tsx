import { PageHeader, PageShell } from "@/components/page-header";
import { MoneyView } from "@/components/views/money-view";

export const metadata = { title: "Money" };

export default function MoneyPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="money, gently"
        title="Know where you"
        accent="stand."
        subtitle="A clear view of your spending and plans, without connecting a bank account."
      />
      <MoneyView />
    </PageShell>
  );
}
