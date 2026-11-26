"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Palette, Sun, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/field";
import { SectionTitle } from "@/components/page-header";
import { Slip } from "@/components/notebook";
import { FOCUS_AREAS, type FocusAreaId } from "@/lib/focus-areas";
import { cn } from "@/lib/utils";
import { type Profile } from "./api";
import { EmailRemindersSwitch } from "./email-reminders";
import { applyTheme } from "./use-profile";

const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Asia/Kolkata", "UTC"];
  }
})();

/** The browser's own name for a zone, so aliases like Asia/Kolkata and Asia/Calcutta compare equal. */
const canonicalZone = (tz: string) => {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    return tz;
  }
};

const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
};

/** Profile and Today & look share one form, with a save bar that appears once something changes. */
export function PreferencesForm({
  profile,
  email,
  saving,
  error,
  onSave,
}: {
  profile: Profile;
  email?: string;
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
        <SectionTitle
          icon={UserRound}
          title="Profile"
          aside={email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
        />
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
            {here && canonicalZone(here) !== canonicalZone(v.timezone) && (
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
        <EmailRemindersSwitch profileId={profile.id} />
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
