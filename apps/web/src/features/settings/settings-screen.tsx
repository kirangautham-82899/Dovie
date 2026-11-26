"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, MonitorSmartphone, Palette, ShieldCheck, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { ErrorNote, PageHeader } from "@/components/page-header";
import { Sticky, StickyValue } from "@/components/notebook";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useProfile } from "./use-profile";
import { PreferencesForm } from "./preferences-form";
import { SecuritySection, ago, useFactors } from "./security-section";
import { DangerSection, DataSection } from "./data-sections";

/** Header copy, shared with the loading state so the page doesn't jump. */
export const SETTINGS_HEADER = {
  eyebrow: "settings",
  title: "Your space,",
  accent: "your way.",
};

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "look", label: "Today & look", icon: Palette },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "data", label: "Privacy & data", icon: Download },
  { id: "danger", label: "Delete", icon: Trash2 },
] as const;

function useAuthUser() {
  return useQuery({ queryKey: ["auth-user"], queryFn: async () => (await createClient().auth.getUser()).data.user });
}

export function SettingsScreen() {
  const [error, setError] = useState<string | null>(null);
  const { query, update } = useProfile(setError);
  const user = useAuthUser();
  const factors = useFactors();

  const header = <PageHeader compact {...SETTINGS_HEADER} />;

  if (query.isPending)
    return (
      <>
        {header}
        <p className="text-sm text-muted-foreground">Loading your settings…</p>
      </>
    );
  if (query.isError)
    return (
      <>
        {header}
        <ErrorNote message={query.error.message} onRetry={() => query.refetch()} />
      </>
    );

  const profile = query.data;
  const twoStep = !!factors.data?.totp.some((f) => f.status === "verified");
  const google = !!user.data?.identities?.some((i) => i.provider === "google");
  const hasPassword = !!user.data?.identities?.some((i) => i.provider === "email");
  const methods = [hasPassword && "Email", google && "Google"].filter(Boolean).join(" & ") || "Email";
  const emailConfirmed = !!user.data?.email_confirmed_at;
  const protections = Number(twoStep) + Number(emailConfirmed);

  return (
    <>
      {header}

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 md:grid-cols-3">
        <Sticky
          label="Hello"
          icon={UserRound}
          caption={profile.timezone.replace(/_/g, " ")}
          tilt="-rotate-1 [--tape-tilt:-4deg]"
          tone="bg-mint text-mint-foreground"
        >
          <StickyValue value={profile.display_name || "friend"} className="truncate text-xl sm:text-3xl" />
        </Sticky>
        <Sticky
          label="Protection"
          icon={twoStep ? ShieldCheck : ShieldAlert}
          caption={twoStep ? "two-step is on" : "turn on two-step"}
          tilt="rotate-1 [--tape-tilt:3deg]"
          tone={twoStep ? "bg-lilac text-lilac-foreground" : "bg-butter text-butter-foreground"}
        >
          <StickyValue value={protections} unit="of 2" className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Signs in with"
          icon={MonitorSmartphone}
          caption={user.data?.last_sign_in_at ? `last sign-in ${ago(user.data.last_sign_in_at)}` : "on this device"}
          tilt="-rotate-[0.5deg] [--tape-tilt:-2deg]"
          tone="bg-sky text-sky-foreground"
          className="col-span-2 md:col-span-1"
        >
          <StickyValue value={methods} className="truncate text-2xl sm:text-3xl" />
        </Sticky>
      </div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-4">
          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible">
            {SECTIONS.map((s) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:rounded-lg lg:border-transparent lg:bg-transparent lg:hover:bg-card",
                    s.id === "danger" && "hover:text-destructive",
                  )}
                >
                  <s.icon className="size-4" /> {s.label}
                  {s.id === "security" && !twoStep && <span aria-label="needs attention" className="ml-auto size-2 rounded-full bg-butter-foreground/70" />}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <PreferencesForm
            key={profile.id}
            profile={profile}
            email={user.data?.email}
            saving={update.isPending}
            error={error}
            onSave={(v) => {
              setError(null);
              update.mutate(v);
            }}
          />
          <SecuritySection
            twoStep={twoStep}
            factors={factors.data}
            factorsError={factors.error?.message}
            google={google}
            hasPassword={hasPassword}
            emailConfirmed={emailConfirmed}
          />
          <DataSection />
          <DangerSection />
        </div>
      </div>
    </>
  );
}
