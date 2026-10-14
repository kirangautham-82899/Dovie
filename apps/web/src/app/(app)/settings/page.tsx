import { PageHeader, PageShell } from "@/components/page-header";
import { SettingsScreen } from "@/features/settings/settings-screen";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="your space"
        title="Your space,"
        accent="your way."
        subtitle="Small settings for a space that belongs to you. This is yours to adjust as your life changes."
      />
      <SettingsScreen />
    </PageShell>
  );
}
