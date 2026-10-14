"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, LogOut, ShieldCheck, Smartphone, SlidersHorizontal, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { Field, selectClass } from "@/components/field";
import { ErrorNote, SectionTitle } from "@/components/page-header";
import { createClient } from "@/lib/supabase/client";
import { signOutAndLeave } from "@/lib/sign-out";
import { clearAppCache } from "@/lib/app-cache";
import { FOCUS_AREAS, type FocusAreaId } from "@/lib/focus-areas";
import { cn } from "@/lib/utils";
import { clearMyData, deleteMyAccount, exportMyData, type Profile } from "./api";
import { applyTheme, useProfile } from "./use-profile";

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-4 border-b py-3 text-left"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}>
        <span
          className={cn(
            "absolute top-1 size-4 rounded-full bg-card shadow transition-transform",
            value ? "translate-x-6" : "translate-x-1",
          )}
        />
      </span>
    </button>
  );
}

const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Kolkata", "UTC"];
  }
})();

export function SettingsScreen() {
  const [error, setError] = useState<string | null>(null);
  const { query, update } = useProfile(setError);

  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading your settings…</p>;
  if (query.isError) return <ErrorNote message={query.error.message} onRetry={() => query.refetch()} />;

  return (
    <div className="ruled lg:grid-cols-2">
      <div className="divide-y">
        <PreferencesCard
          key={query.data.id}
          profile={query.data}
          saving={update.isPending}
          error={error}
          onSave={(v) => {
            setError(null);
            update.mutate(v);
          }}
        />
        <InstallCard />
      </div>
      <div className="divide-y">
        <PrivacyCard />
        <ClearDataCard />
        <AccountCard />
      </div>
    </div>
  );
}

function PreferencesCard({
  profile,
  saving,
  error,
  onSave,
}: {
  profile: Profile;
  saving: boolean;
  error: string | null;
  onSave: (v: Partial<Profile>) => void;
}) {
  const [name, setName] = useState(profile.display_name ?? "");
  const [timezone, setTimezone] = useState(profile.timezone);
  const [interests, setInterests] = useState(profile.interests ?? "");
  const [areas, setAreas] = useState<FocusAreaId[]>(profile.focus_areas);
  const [reminders, setReminders] = useState(profile.reminders_enabled);
  const [dark, setDark] = useState(profile.theme === "dark");
  const [saved, setSaved] = useState(false);

  async function toggleReminders(on: boolean) {
    setReminders(on);
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  return (
    <Card>
      <SectionTitle icon={SlidersHorizontal} title="A few preferences" />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            display_name: name.trim() || null,
            timezone,
            interests: interests.trim() || null,
            focus_areas: areas,
            reminders_enabled: reminders,
            theme: dark ? "dark" : "light",
          });
          setSaved(true);
        }}
      >
        <Field label="What should we call you?">
          <Input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Timezone" hint="Decides when your day starts and ends.">
          <select className={selectClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {(TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES]).map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </Field>
        <Field label="Things you care about">
          <Input
            placeholder="Movement, family, making things"
            maxLength={200}
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
        </Field>
        <div>
          <p className="mb-2 text-xs font-semibold">Show on Today</p>
          <div className="flex flex-wrap gap-1.5">
            {FOCUS_AREAS.map((a) => {
              const on = areas.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setAreas(on ? areas.filter((x) => x !== a.id) : [...areas, a.id])}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
        <Toggle
          label="Gentle reminders"
          description="A local note about bills due soon while Dovie is open. Nothing is sent in the background."
          value={reminders}
          onChange={toggleReminders}
        />
        <Toggle
          label="Evening colors"
          description="A softer, darker palette for low light."
          value={dark}
          onChange={(v) => {
            setDark(v);
            applyTheme(v ? "dark" : "light");
          }}
        />
        {error && <ErrorNote message={error} />}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            Save preferences
          </Button>
          {saved && !saving && !error && <span className="text-xs text-primary">Saved.</span>}
        </div>
      </form>
    </Card>
  );
}

function PrivacyCard() {
  const exporter = useMutation({
    mutationFn: exportMyData,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dovie-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <Card>
      <SectionTitle icon={ShieldCheck} title="Privacy & your data" />
      <p className="text-sm text-muted-foreground">
        Dovie never connects to your bank, cards, texts or messages. Journal text is encrypted in your browser before it
        is saved. Insights use numbers and completion patterns, never journal words.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => exporter.mutate()} disabled={exporter.isPending}>
          <Download /> {exporter.isPending ? "Preparing…" : "Download my data"}
        </Button>
        <Link href="/privacy" className="text-xs underline">
          Privacy notice
        </Link>
        <Link href="/terms" className="text-xs underline">
          Terms
        </Link>
      </div>
      {exporter.isError && <div className="mt-3"><ErrorNote message={exporter.error.message} /></div>}
    </Card>
  );
}

function ClearDataCard() {
  const [confirmText, setConfirmText] = useState("");
  const clear = useMutation({
    mutationFn: clearMyData,
    // A full page load drops every cached screen, so onboarding starts fresh.
    onSuccess: () => {
      clearAppCache();
      window.location.replace("/onboarding");
    },
  });

  return (
    <Card>
      <SectionTitle icon={Trash2} title="Clear your Dovie data" />
      <p className="text-sm text-muted-foreground">
        Permanently removes every task, habit, goal, check-in, money record and journal entry from this account. Your
        sign-in stays. This cannot be undone, so download an export first if you&apos;d like a copy.
      </p>
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (confirmText === "DELETE") clear.mutate();
        }}
      >
        <Input
          aria-label="Type DELETE to confirm"
          placeholder="Type DELETE to confirm"
          className="max-w-56"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        <Button type="submit" variant="destructive" disabled={confirmText !== "DELETE" || clear.isPending}>
          {clear.isPending ? "Clearing…" : "Clear everything"}
        </Button>
      </form>
      {clear.isError && <div className="mt-3"><ErrorNote message={clear.error.message} /></div>}
    </Card>
  );
}

function AccountCard() {
  const [confirming, setConfirming] = useState(false);
  const user = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await createClient().auth.getUser()).data.user,
  });
  const remove = useMutation({
    mutationFn: deleteMyAccount,
    // A full page load, so nothing on screen refetches for an account that is gone.
    onSuccess: () => {
      clearAppCache();
      window.location.replace("/");
    },
  });
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Card>
      <SectionTitle icon={UserRound} title="Account & sign-in" />
      {user.data?.email && (
        <p className="text-sm">
          Signed in as <span className="font-semibold">{user.data.email}</span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOutAndLeave();
          }}
        >
          <LogOut /> {signingOut ? "Signing out…" : "Sign out"}
        </Button>
        <Button variant="destructive" onClick={() => setConfirming(true)}>
          Delete my account
        </Button>
      </div>
      <Modal open={confirming} title="Delete your Dovie account?" onClose={() => setConfirming(false)}>
        <p className="text-sm text-muted-foreground">
          This permanently deletes your account and every Dovie record in it, including your journal. You can export your
          data first from Privacy &amp; your data.
        </p>
        {remove.isError && <div className="mt-3"><ErrorNote message={remove.error.message} /></div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Keep my account
          </Button>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            {remove.isPending ? "Deleting…" : "Delete account and data"}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function InstallCard() {
  return (
    <Card className="border-t-2 border-t-chart-2">
      <SectionTitle icon={Smartphone} title="Keep Dovie close" />
      <p className="text-sm opacity-90">
        On supported browsers, use the browser menu to install Dovie or add it to your home screen. It opens like an app;
        your data still needs a connection.
      </p>
    </Card>
  );
}
