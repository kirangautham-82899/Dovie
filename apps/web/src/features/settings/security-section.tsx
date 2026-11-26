"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Copy, KeyRound, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { ErrorNote, SectionTitle } from "@/components/page-header";
import { Slip } from "@/components/notebook";
import { createClient } from "@/lib/supabase/client";
import { signOutAndLeave } from "@/lib/sign-out";
import { clearAppCache } from "@/lib/app-cache";
import { cn } from "@/lib/utils";

export function useFactors() {
  return useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await createClient().auth.mfa.listFactors();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function ago(iso: string | undefined) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

type Factors = NonNullable<ReturnType<typeof useFactors>["data"]>;

export function SecuritySection({
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
    {
      ok: true,
      label: google && hasPassword ? "Google and password sign-in" : google ? "Google sign-in" : "Password sign-in",
      detail: hasPassword
        ? "Use a long password you don't use anywhere else. Change it below."
        : "Google protects this sign-in too.",
    },
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
