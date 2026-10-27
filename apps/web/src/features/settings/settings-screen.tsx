"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  Moon,
  Palette,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { Field, selectClass } from "@/components/field";
import { ErrorNote, PageHeader, SectionTitle } from "@/components/page-header";
import { Slip, Sticky, StickyValue } from "@/components/notebook";
import { createClient } from "@/lib/supabase/client";
import { signOutAndLeave } from "@/lib/sign-out";
import { clearAppCache } from "@/lib/app-cache";
import { FOCUS_AREAS, type FocusAreaId } from "@/lib/focus-areas";
import { cn } from "@/lib/utils";
import { clearMyData, deleteMyAccount, exportMyData, type Profile } from "./api";
import { applyTheme, useProfile } from "./use-profile";

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

const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Kolkata", "UTC"];
  }
})();

const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
};

function useAuthUser() {
  return useQuery({ queryKey: ["auth-user"], queryFn: async () => (await createClient().auth.getUser()).data.user });
}

function useFactors() {
  return useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await createClient().auth.mfa.listFactors();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

function ago(iso: string | undefined) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

export function SettingsScreen() {
  const [error, setError] = useState<string | null>(null);
  const { query, update } = useProfile(setError);
  const user = useAuthUser();
  const factors = useFactors();

  const header = <PageHeader compact {...SETTINGS_HEADER} eyebrow={user.data?.email ? `settings · ${user.data.email}` : "settings"} />;

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
          <StickyValue value={profile.display_name || "friend"} className="truncate text-2xl sm:text-3xl" />
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
          label="Signed in"
          icon={MonitorSmartphone}
          caption={user.data?.last_sign_in_at ? `last sign-in ${ago(user.data.last_sign_in_at)}` : "on this device"}
          tilt="-rotate-[0.5deg] [--tape-tilt:-2deg]"
          tone="bg-sky text-sky-foreground"
          className="col-span-2 md:col-span-1"
        >
          <StickyValue value={google ? "Google" : "Email"} className="text-2xl sm:text-3xl" />
        </Sticky>
      </div>

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-4">
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
            hasPassword={!!user.data?.identities?.some((i) => i.provider === "email")}
            emailConfirmed={emailConfirmed}
          />
          <DataSection />
          <DangerSection />
        </div>
      </div>
    </>
  );
}

/** Profile and Today & look share one form, with a save bar that appears once something changes. */
function PreferencesForm({
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
  const initial = {
    name: profile.display_name ?? "",
    timezone: profile.timezone,
    interests: profile.interests ?? "",
    areas: profile.focus_areas,
    reminders: profile.reminders_enabled,
    dark: profile.theme === "dark",
  };
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => {
    setSaved(false);
    setV((cur) => ({ ...cur, [k]: value }));
  };
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const here = deviceTimezone();

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  async function toggleReminders(on: boolean) {
    set("reminders", on);
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  const save = () => {
    onSave({
      display_name: v.name.trim() || null,
      timezone: v.timezone,
      interests: v.interests.trim() || null,
      focus_areas: v.areas,
      reminders_enabled: v.reminders,
      theme: v.dark ? "dark" : "light",
    });
    setSaved(true);
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Slip className="p-4 sm:p-5">
        <div id="profile" className="scroll-mt-6" />
        <SectionTitle icon={UserRound} title="Profile" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What should we call you?">
            <Input maxLength={60} autoComplete="nickname" value={v.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Timezone" hint="Decides when your day starts and ends.">
            <div className="flex gap-2">
              <select className={selectClass} value={v.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {(TIMEZONES.includes(v.timezone) ? TIMEZONES : [v.timezone, ...TIMEZONES]).map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            {here && here !== v.timezone && (
              <button type="button" onClick={() => set("timezone", here)} className="mt-1.5 text-xs font-semibold text-primary hover:underline">
                Use this device&apos;s timezone ({here.replace(/_/g, " ")})
              </button>
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Things you care about" hint="Optional. Helps Dovie's suggestions feel like yours.">
              <Input placeholder="Movement, family, making things" maxLength={200} value={v.interests} onChange={(e) => set("interests", e.target.value)} />
            </Field>
          </div>
        </div>
      </Slip>

      <Slip className="p-4 sm:p-5">
        <div id="look" className="scroll-mt-6" />
        <SectionTitle icon={Palette} title="Today & look" />
        <p className="mb-2 text-xs font-semibold">Show on Today</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FOCUS_AREAS.map((a) => {
            const on = v.areas.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => set("areas", on ? v.areas.filter((x) => x !== a.id) : [...v.areas, a.id as FocusAreaId])}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
                  on ? "border-primary/40 bg-primary/[0.06]" : "hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}
                >
                  {on && <Check className="size-3" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{a.label}</span>
                  <span className="block text-xs text-muted-foreground">{a.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-5 mb-2 text-xs font-semibold">Colours</p>
        <div role="radiogroup" aria-label="Colours" className="grid max-w-md grid-cols-2 gap-3">
          {[
            { dark: false, label: "Daylight", icon: Sun, swatch: "bg-[#fbf7f4]", ink: "bg-[#2b2533]" },
            { dark: true, label: "Evening", icon: Moon, swatch: "bg-[#231f29]", ink: "bg-[#efe8f3]" },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              role="radio"
              aria-checked={v.dark === t.dark}
              onClick={() => {
                set("dark", t.dark);
                applyTheme(t.dark ? "dark" : "light");
              }}
              className={cn("overflow-hidden rounded-xl border text-left transition-shadow", v.dark === t.dark && "ring-2 ring-primary")}
            >
              <span aria-hidden className={cn("block space-y-1.5 p-3", t.swatch)}>
                <span className={cn("block h-1.5 w-1/2 rounded-full opacity-80", t.ink)} />
                <span className={cn("block h-1.5 w-3/4 rounded-full opacity-40", t.ink)} />
                <span className="block h-1.5 w-1/3 rounded-full bg-primary" />
              </span>
              <span className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium">
                <t.icon className="size-3.5" /> {t.label}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={v.reminders}
          onClick={() => void toggleReminders(!v.reminders)}
          className="mt-5 flex w-full items-center justify-between gap-4 border-t pt-4 text-left"
        >
          <span>
            <span className="block text-sm font-semibold">Gentle reminders</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              A local note about bills due soon while Dovie is open. Nothing is sent in the background.
            </span>
          </span>
          <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", v.reminders ? "bg-primary" : "bg-muted")}>
            <span className={cn("absolute top-1 size-4 rounded-full bg-card shadow transition-transform", v.reminders ? "translate-x-6" : "translate-x-1")} />
          </span>
        </button>
      </Slip>

      {(dirty || saved || error) && (
        <div
          role="status"
          className="animate-rise sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-full border bg-card/95 py-2 pr-2 pl-5 shadow-soft backdrop-blur"
        >
          {error ? (
            <span className="text-sm text-destructive">{error}</span>
          ) : saved && !dirty ? (
            <span className="flex items-center gap-1.5 text-sm text-mint-foreground">
              <Check className="size-4" /> Saved
            </span>
          ) : (
            <span className="text-sm">You have unsaved changes</span>
          )}
          {dirty && (
            <span className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setV(initial);
                  applyTheme(initial.dark ? "dark" : "light");
                }}
              >
                Discard
              </Button>
              <Button type="submit" variant="solid" loading={saving}>
                Save changes
              </Button>
            </span>
          )}
        </div>
      )}
    </form>
  );
}

type Factors = NonNullable<ReturnType<typeof useFactors>["data"]>;

function SecuritySection({
  twoStep,
  factors,
  factorsError,
  google,
  hasPassword,
  emailConfirmed,
}: {
  twoStep: boolean;
  factors: Factors | undefined;
  factorsError?: string;
  google: boolean;
  hasPassword: boolean;
  emailConfirmed: boolean;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [everywhereError, setEverywhereError] = useState<string | null>(null);

  async function signOutEverywhere() {
    if (!confirm("Sign out of Dovie on every device, including this one?")) return;
    setSigningOut(true);
    const { error } = await createClient().auth.signOut({ scope: "global" });
    if (error) {
      setSigningOut(false);
      return setEverywhereError(error.message);
    }
    clearAppCache();
    window.location.replace("/login");
  }

  const checks = [
    { ok: twoStep, label: "Two-step verification", detail: twoStep ? "A code from your phone is needed to sign in." : "Add a code from your phone, so a password alone isn't enough." },
    { ok: emailConfirmed, label: "Verified email", detail: emailConfirmed ? "We can reach you if you need to recover the account." : "Confirm your email from the link we sent." },
    { ok: true, label: google ? "Signed in with Google" : "Password sign-in", detail: google ? "Google protects this sign-in too." : "Use a long password you don't use anywhere else." },
  ];

  return (
    <Slip className="p-4 sm:p-5">
      <div id="security" className="scroll-mt-6" />
      <SectionTitle icon={ShieldCheck} title="Security" />

      <ul className="mb-5 divide-y rounded-xl border">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-3 px-3 py-2.5">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                c.ok ? "bg-mint text-mint-foreground" : "bg-butter text-butter-foreground",
              )}
            >
              {c.ok ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}
            </span>
            <span>
              <span className="block text-sm font-semibold">{c.label}</span>
              <span className="block text-xs text-muted-foreground">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      <TwoStep twoStep={twoStep} factors={factors} loadError={factorsError} />
      {hasPassword && <PasswordChange />}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div>
          <p className="text-sm font-semibold">Signed in somewhere you don&apos;t recognise?</p>
          <p className="text-xs text-muted-foreground">Signs you out on every phone and browser, including this one.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOutAndLeave();
            }}
          >
            <LogOut /> Sign out here
          </Button>
          <Button variant="destructive" loading={signingOut} onClick={() => void signOutEverywhere()}>
            Sign out everywhere
          </Button>
        </div>
      </div>
      {everywhereError && <div className="mt-3"><ErrorNote message={everywhereError} /></div>}
    </Slip>
  );
}

function TwoStep({ twoStep, factors, loadError }: { twoStep: boolean; factors: Factors | undefined; loadError?: string }) {
  const qc = useQueryClient();
  const [setup, setSetup] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["mfa-factors"] });

  async function start() {
    setBusy(true);
    setError(null);
    const mfa = createClient().auth.mfa;
    // Clear any half-finished setup first, so it can't block a new one.
    for (const f of factors?.all.filter((f) => f.status === "unverified") ?? []) await mfa.unenroll({ factorId: f.id });
    const { data, error } = await mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}` });
    setBusy(false);
    if (error) return setError(error.message);
    setSetup({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: setup.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return setError("That code didn't match. Try the newest code in your app.");
    setSetup(null);
    setCode("");
    void refresh();
  }

  async function turnOff() {
    if (!confirm("Turn off two-step verification? Your password alone will be enough to sign in again.")) return;
    setBusy(true);
    setError(null);
    const mfa = createClient().auth.mfa;
    for (const f of factors?.totp.filter((f) => f.status === "verified") ?? []) {
      const { error } = await mfa.unenroll({ factorId: f.id });
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
    }
    // The session is still aal2; refreshing it settles the new, lower level.
    await createClient().auth.refreshSession();
    setBusy(false);
    void refresh();
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", twoStep ? "bg-mint text-mint-foreground" : "bg-lilac text-lilac-foreground")}>
            <Smartphone className="size-4" />
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              Two-step verification
              <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", twoStep ? "bg-mint text-mint-foreground" : "bg-muted text-muted-foreground")}>
                {twoStep ? "On" : "Off"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Uses an authenticator app such as Google Authenticator, Microsoft Authenticator or Authy. Even with your
              password, nobody can open your Dovie without the code on your phone.
            </p>
          </div>
        </div>
        {!setup &&
          (twoStep ? (
            <Button variant="outline" size="sm" loading={busy} onClick={() => void turnOff()}>
              Turn off
            </Button>
          ) : (
            <Button variant="solid" size="sm" loading={busy} disabled={!factors} onClick={() => void start()}>
              Set it up
            </Button>
          ))}
      </div>

      {setup && (
        <div className="mt-4 grid gap-4 border-t border-dashed pt-4 sm:grid-cols-[auto_1fr]">
          {/* The QR is an SVG data URL from Supabase. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR code to add Dovie to your authenticator app" className="size-40 rounded-lg border bg-white p-2" />
          <div className="space-y-3 text-sm">
            <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>Open your authenticator app and add an account.</li>
              <li>Scan this code, or type the key below.</li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{setup.secret}</code>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Copy key"
                onClick={() => {
                  void navigator.clipboard.writeText(setup.secret);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <form onSubmit={confirmCode} className="flex flex-wrap gap-2">
              <Input
                aria-label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                placeholder="123 456"
                className="w-36 text-center font-mono tracking-[0.25em]"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button type="submit" loading={busy} disabled={code.replace(/\s/g, "").length !== 6}>
                Turn on
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSetup(null)}>
                Cancel
              </Button>
            </form>
          </div>
        </div>
      )}
      {(error || loadError) && <p className="mt-3 text-sm text-destructive">{error ?? loadError}</p>}
    </div>
  );
}

function PasswordChange() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: boolean }>({});
  const long = pw.length >= 10;
  const mixed = /[a-z]/i.test(pw) && /[0-9\W]/.test(pw);
  const valid = long && mixed && pw === again;

  return (
    <div className="mt-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky text-sky-foreground">
            <KeyRound className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Password</p>
            <p className="text-xs text-muted-foreground">
              {state.done ? "Password changed. Use the new one next time you sign in." : "At least 10 characters, with a number or symbol."}
            </p>
          </div>
        </div>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Change
          </Button>
        )}
      </div>
      {open && (
        <form
          className="mt-4 grid gap-3 border-t border-dashed pt-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return;
            setState({ busy: true });
            const { error } = await createClient().auth.updateUser({ password: pw });
            if (error) return setState({ error: error.message });
            setState({ done: true });
            setPw("");
            setAgain("");
            setOpen(false);
          }}
        >
          <Field label="New password">
            <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <Field label="Type it again">
            <Input
              type="password"
              autoComplete="new-password"
              value={again}
              aria-invalid={!!again && again !== pw}
              onChange={(e) => setAgain(e.target.value)}
            />
          </Field>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:col-span-2">
            {[
              { ok: long, label: "10+ characters" },
              { ok: mixed, label: "a number or symbol" },
              { ok: !!again && pw === again, label: "both match" },
            ].map((r) => (
              <li key={r.label} className={cn("flex items-center gap-1", r.ok ? "text-mint-foreground" : "text-muted-foreground")}>
                <Check className={cn("size-3", !r.ok && "opacity-30")} /> {r.label}
              </li>
            ))}
          </ul>
          {state.error && <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={state.busy} disabled={!valid}>
              Save new password
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function DataSection() {
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
    <Slip className="p-4 sm:p-5">
      <div id="data" className="scroll-mt-6" />
      <SectionTitle icon={Download} title="Privacy & your data" />
      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        {[
          "Never connects to your bank, cards, texts or messages",
          "Every row is locked to your account in the database",
          "Insights use numbers only, never journal words",
          "No ads, and your data is never sold",
        ].map((t) => (
          <li key={t} className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-mint-foreground" /> {t}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
        <Button variant="outline" onClick={() => exporter.mutate()} loading={exporter.isPending}>
          {!exporter.isPending && <Download />} {exporter.isPending ? "Preparing…" : "Download my data"}
        </Button>
        <Link href="/privacy" className="text-xs underline">
          Privacy notice
        </Link>
        <Link href="/terms" className="text-xs underline">
          Terms
        </Link>
      </div>
      {exporter.isError && <div className="mt-3"><ErrorNote message={exporter.error.message} /></div>}
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Smartphone className="mt-0.5 size-3.5 shrink-0" />
        Keep Dovie close: use your browser&apos;s menu to install it or add it to your home screen. It opens like an app.
      </p>
    </Slip>
  );
}

function DangerSection() {
  const [confirmText, setConfirmText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const clear = useMutation({
    mutationFn: clearMyData,
    // A full page load drops every cached screen, so onboarding starts fresh.
    onSuccess: () => {
      clearAppCache();
      window.location.replace("/onboarding");
    },
  });
  const remove = useMutation({
    mutationFn: deleteMyAccount,
    // A full page load, so nothing on screen refetches for an account that is gone.
    onSuccess: () => {
      clearAppCache();
      window.location.replace("/");
    },
  });

  return (
    <Slip className="border-destructive/30 p-4 sm:p-5">
      <div id="danger" className="scroll-mt-6" />
      <SectionTitle icon={Trash2} title="Clear or delete" />
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Clear your Dovie data</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Removes every task, habit, goal, check-in, money record and journal page. Your sign-in stays. This can&apos;t
            be undone, so download your data first if you&apos;d like a copy.
          </p>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (confirmText === "DELETE") clear.mutate();
            }}
          >
            <Input
              aria-label="Type DELETE to confirm"
              placeholder="Type DELETE"
              className="max-w-40"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <Button type="submit" variant="destructive" loading={clear.isPending} disabled={confirmText !== "DELETE"}>
              Clear everything
            </Button>
          </form>
          {clear.isError && <div className="mt-3"><ErrorNote message={clear.error.message} /></div>}
        </div>
        <div className="md:border-l md:pl-5">
          <p className="text-sm font-semibold">Delete your account</p>
          <p className="mt-1 text-xs text-muted-foreground">Deletes your account and everything in it, for good.</p>
          <Button variant="destructive" className="mt-3" onClick={() => setConfirming(true)}>
            Delete my account
          </Button>
        </div>
      </div>

      <Modal open={confirming} title="Delete your Dovie account?" onClose={() => setConfirming(false)}>
        <p className="text-sm text-muted-foreground">
          This permanently deletes your account and every Dovie record in it, including your journal. You can download
          your data first from Privacy &amp; your data.
        </p>
        {remove.isError && <div className="mt-3"><ErrorNote message={remove.error.message} /></div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Keep my account
          </Button>
          <Button className="bg-destructive text-white hover:bg-destructive/90" onClick={() => remove.mutate()} loading={remove.isPending}>
            Delete account and data
          </Button>
        </div>
      </Modal>
    </Slip>
  );
}
