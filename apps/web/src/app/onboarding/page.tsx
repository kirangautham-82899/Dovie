"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BookHeart, Check, Footprints, HeartPulse, Repeat, Sun, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FOCUS_AREAS, type FocusAreaId } from "@/lib/focus-areas";
import { todayInTimezone } from "@/lib/dates";
import { SplitShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNote } from "@/components/page-header";
import { TEMPLATES, applyTemplate, type TemplateId } from "@/features/wellness/api";
import { cn } from "@/lib/utils";

const AREA_ICON: Record<FocusAreaId, typeof Sun> = {
  tasks: Sun,
  habits: Repeat,
  fitness: Footprints,
  wellness: HeartPulse,
  money: Wallet,
  journal: BookHeart,
};

function StepLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-2.5 font-serif text-xl tracking-tight">
      <span className="text-rose font-serif text-sm">{n}</span>
      {children}
    </h2>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<FocusAreaId[]>(["tasks", "habits", "wellness"]);
  const [template, setTemplate] = useState<TemplateId | null>(null);
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("id,display_name,is_adult_confirmed,onboarded_at").single(),
      supabase.auth.getSession(),
    ]).then(([{ data }, { data: auth }]) => {
      if (!data) return;
      if (data.onboarded_at) return router.replace("/today");
      // Email sign-ups store display_name; Google sign-ins bring full_name/name instead.
      const meta = auth.session?.user.user_metadata ?? {};
      const fallback = String(meta.full_name ?? meta.name ?? "").slice(0, 60);
      setUserId(data.id);
      setName(data.display_name ?? fallback);
      setAdult(data.is_adult_confirmed);
    });
  }, [router]);

  function toggle(id: FocusAreaId) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!adult || !consent) return setError("Please confirm both boxes before continuing.");
    if (!userId) return router.replace("/login");
    setSaving(true);
    setError(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    const { error } = await createClient()
      .from("profiles")
      .update({
        display_name: name.trim() || null,
        focus_areas: selected,
        starter_template: template,
        timezone,
        is_adult_confirmed: true,
        consented_at: new Date().toISOString(),
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (!error && template) {
      // The starter rhythm is a nice-to-have; a failure here should not block the user.
      await applyTemplate(template, todayInTimezone(timezone)).catch(() => {});
    }
    setSaving(false);
    if (error) return setError(error.message);
    // The cached profile still says "not onboarded"; drop it so every screen
    // reads the fresh one instead of bouncing back here.
    qc.removeQueries({ queryKey: ["profile"] });
    router.replace("/today");
    router.refresh();
  }

  const firstName = name.trim().split(/\s+/)[0];
  const steps = [
    { label: "Your name", done: !!name.trim() },
    { label: "What matters", done: selected.length > 0 },
    { label: "Starter rhythm", done: template !== null, optional: true },
    { label: "A quick yes", done: adult && consent },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const picked = FOCUS_AREAS.filter((a) => selected.includes(a.id));

  const aside = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8 xl:px-10">
        <p className="border-l-2 border-primary pl-2.5 text-[0.7rem] font-semibold tracking-[0.14em] text-primary uppercase">
          First, a little hello
        </p>
        <p className="mt-4 font-serif text-5xl leading-[1.02] tracking-tight xl:text-6xl">
          Let&apos;s make this <em className="text-rose pr-1">yours.</em>
        </p>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          A preview of your space builds as you choose. You can change every piece of it later in Settings.
        </p>

        {/* Live preview of the Today screen they are shaping. */}
        <div aria-hidden className="mt-7 max-w-md border border-primary/15 bg-card/80 backdrop-blur-sm">
          <div className="border-b px-5 py-4">
            <p className="text-[0.6rem] font-bold tracking-[0.15em] text-primary uppercase">Your Today</p>
            <p className="mt-0.5 font-serif text-2xl leading-tight">
              Good morning, <em className="text-rose pr-1">{firstName || "friend"}.</em>
            </p>
          </div>
          {picked.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">Pick a few things to make room for.</p>
          ) : (
            <ul className="divide-y">
              {picked.map((a) => {
                const Icon = AREA_ICON[a.id];
                return (
                  <li key={a.id} className="animate-rise flex items-center gap-3 px-5 py-2.5 text-sm">
                    <Icon className="size-4 text-primary" />
                    <span className="flex-1 font-medium">{a.label}</span>
                    <span className="text-xs text-muted-foreground">{a.hint}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {template && (
            <div className="animate-rise border-t px-5 py-3">
              <p className="text-[0.6rem] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                {TEMPLATES[template].label} starter
              </p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {[...TEMPLATES[template].tasks, ...TEMPLATES[template].habits].map((t) => (
                  <span key={t} className="rounded-full bg-secondary px-2.5 py-1 text-[0.7rem] text-secondary-foreground">
                    {t}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      </div>

      <ol className="grid shrink-0 grid-cols-4 divide-x border-t border-primary/10 bg-background/40 backdrop-blur-sm">
        {steps.map((s, i) => (
          <li key={s.label} className="relative px-5 py-4">
            <span
              aria-hidden
              className={cn("absolute inset-x-0 top-0 h-0.5 transition-colors", s.done ? "bg-primary" : "bg-transparent")}
            />
            <p className="flex items-center gap-1.5 text-[0.65rem] font-bold tracking-wider text-muted-foreground uppercase">
              0{i + 1}
              {s.done && <Check className="size-3 text-primary" />}
            </p>
            <p className="mt-1 text-xs">
              {s.label}
              {s.optional && <span className="text-muted-foreground"> · optional</span>}
            </p>
          </li>
        ))}
      </ol>
    </>
  );

  return (
    <SplitShell
      centered={false}
      aside={aside}
      headerRight={
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{doneCount} of 4 done</span>
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / 4) * 100}%` }} />
          </span>
        </div>
      }
      footer="Your information is yours. Journal entries are encrypted in your browser before saving."
    >
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Welcome to Dovie</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">A few choices to help it feel like home.</p>

      <form onSubmit={save} className="mt-6 divide-y border-t [&>*]:py-5">
        <section>
          <label htmlFor="name">
            <StepLabel n="01">What should we call you?</StepLabel>
          </label>
          <Input
            id="name"
            className="mt-3"
            placeholder="Your name"
            autoComplete="given-name"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </section>

        <section>
          <StepLabel n="02">What would you like more room for?</StepLabel>
          <p className="mt-1 text-sm text-muted-foreground">Choose as many as feel right. A starting point, not a commitment.</p>
          <ul className="ruled mt-3 sm:grid-cols-2">
            {FOCUS_AREAS.map((area) => {
              const on = selected.includes(area.id);
              const Icon = AREA_ICON[area.id];
              return (
                <li key={area.id} className={cn(on && "bg-secondary/70")}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(area.id)}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                  >
                    <Icon className={cn("size-4 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{area.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{area.hint}</span>
                    </span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {on && <Check className="size-3" aria-hidden />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <StepLabel n="03">Would a starter rhythm help?</StepLabel>
          <p className="mt-1 text-sm text-muted-foreground">Optional ideas to get going. Edit or remove them anytime.</p>
          <div className="ruled mt-3 sm:grid-cols-3">
            {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={template === id}
                onClick={() => setTemplate(template === id ? null : id)}
                className={cn("px-3.5 py-3 text-left transition-colors", template === id ? "bg-secondary/70" : "hover:bg-muted/50")}
              >
                <span className="flex items-center justify-between text-sm font-medium">
                  {TEMPLATES[id].label}
                  {template === id && <Check className="size-3.5 text-primary" />}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{TEMPLATES[id].blurb}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 text-sm">
          <StepLabel n="04">A quick yes</StepLabel>
          <label className="flex items-start gap-2.5">
            <input type="checkbox" className="mt-1 accent-primary" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            I confirm I am 18 years of age or older. Dovie is currently for adults.
          </label>
          <label className="flex items-start gap-2.5">
            <input type="checkbox" className="mt-1 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I have read the{" "}
              <Link href="/privacy" target="_blank" className="underline underline-offset-2">
                privacy notice
              </Link>{" "}
              and{" "}
              <Link href="/terms" target="_blank" className="underline underline-offset-2">
                terms
              </Link>
              .
            </span>
          </label>
        </section>

        <div className="space-y-3">
          {error && <ErrorNote message={error} />}
          <Button type="submit" size="lg" className="w-full" disabled={saving || selected.length === 0 || !userId}>
            {saving ? "Setting things up…" : "Start with today"}
          </Button>
        </div>
      </form>
    </SplitShell>
  );
}
