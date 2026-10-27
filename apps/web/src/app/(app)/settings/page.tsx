import { PageShell } from "@/components/page-header";
import { Paper } from "@/components/notebook";
import { SettingsScreen } from "@/features/settings/settings-screen";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell>
      <Paper>
        <SettingsScreen />
      </Paper>
    </PageShell>
  );
}
