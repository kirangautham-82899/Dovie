"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slip } from "@/components/notebook";
import { ErrorNote } from "@/components/page-header";
import { MOODS } from "@/features/checkin/mood";
import { cn } from "@/lib/utils";
import { TEMPLATES, applyTemplate, type TemplateId } from "./api";
import { Chips, Heading, lineInput } from "./parts";
import { useWellness } from "./use-wellness";

const ENERGY = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }));

type Day = NonNullable<ReturnType<typeof useWellness>["query"]["data"]>;

/** The everyday tab: how you feel, a focus timer and starter ideas. */
export function DailyTab({ today, day, w }: { today: string; day: Day; w: ReturnType<typeof useWellness> }) {
  return (
    <div className="space-y-8">
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
        <Slip className="p-5 sm:p-6">
          <CheckinForm key={today} day={day} onSave={(v) => w.save.mutate(v)} saving={w.save.isPending} />
        </Slip>
        <Slip className="p-5 sm:p-6">
          <FocusTimer onComplete={(m) => w.focus.mutate(m)} todayMinutes={day.focus_minutes} />
        </Slip>
      </div>
      <Templates today={today} />
    </div>
  );
}

function CheckinForm({
  day,
  onSave,
  saving,
}: {
  day: { sleep_hours: number | null; water_glasses: number; energy: number | null; mood: number | null };
  onSave: (v: { sleep_hours: number | null; water_glasses: number; energy: number | null; mood?: number }) => void;
  saving: boolean;
}) {
  const [sleep, setSleep] = useState(day.sleep_hours === null ? "" : String(day.sleep_hours));
  const [water, setWater] = useState(day.water_glasses);
  const [energy, setEnergy] = useState<number | null>(day.energy);
  const [mood, setMood] = useState<number | null>(day.mood);
  const [saved, setSaved] = useState(false);
  const sleepNum = sleep === "" ? null : Number(sleep);
  const sleepValid = sleepNum === null || (sleepNum >= 0 && sleepNum <= 24);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!sleepValid) return;
        onSave({
          sleep_hours: sleepNum === null ? null : Math.round(sleepNum * 10) / 10,
          water_glasses: water,
          energy,
          ...(mood !== null ? { mood } : {}),
        });
        setSaved(true);
      }}
    >
      <Heading title="How are you feeling?" />
      <div className="grid grid-cols-2 gap-5">
        <label className="block text-xs font-semibold">
          Sleep last night
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={24}
            step={0.5}
            placeholder="hours"
            value={sleep}
            aria-invalid={!sleepValid}
            onChange={(e) => setSleep(e.target.value)}
            className={cn(lineInput, "mt-1 block w-full font-normal aria-invalid:border-destructive")}
          />
        </label>
        <div className="text-xs font-semibold">
          Water today
          <div className="mt-1 flex h-9 items-center justify-between border-b border-foreground/25 font-normal">
            <button type="button" className="px-2 text-lg leading-none text-muted-foreground hover:text-foreground" aria-label="One less glass" onClick={() => setWater((n) => Math.max(0, n - 1))}>
              −
            </button>
            <span className="text-sm tabular-nums">{water} glasses</span>
            <button type="button" className="px-2 text-lg leading-none text-muted-foreground hover:text-foreground" aria-label="One more glass" onClick={() => setWater((n) => Math.min(40, n + 1))}>
              +
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-hand text-xl leading-none text-secondary-foreground">energy, 1 to 5</p>
        <Chips label="Energy" options={ENERGY} value={energy} onChange={setEnergy} />
      </div>
      <div className="space-y-2">
        <p className="font-hand text-xl leading-none text-secondary-foreground">mood, only if it helps</p>
        <Chips label="Mood" options={MOODS} value={mood} onChange={setMood} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving || !sleepValid}>
          Save how I&apos;m doing
        </Button>
        {saved && !saving && <span className="text-xs text-primary">Saved. Thank you for checking in.</span>}
      </div>
    </form>
  );
}

const PRESETS = [10, 25, 45];

/** A focus timer that keeps time from a fixed end point, so a busy tab does not drift. */
function FocusTimer({ onComplete, todayMinutes }: { onComplete: (minutes: number) => void; todayMinutes: number }) {
  const [length, setLength] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(id);
        setEndsAt(null);
        setDone(true);
        completeRef.current(length);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [endsAt, length]);

  const running = endsAt !== null;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  function pick(m: number) {
    setLength(m);
    setRemaining(m * 60);
    setEndsAt(null);
    setDone(false);
  }

  return (
    <div>
      <Heading title="A little focus" aside={`${todayMinutes} min today`} />
      <p className="mt-3 text-sm text-muted-foreground">Take a breath. Give one thing a little attention.</p>
      <div className="my-5 text-center font-serif text-6xl tabular-nums" aria-live="polite">
        {mm}:{ss}
      </div>
      {done && <p className="mb-3 text-center text-sm">Focus time is complete. Take a kind little break.</p>}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            disabled={running}
            className={cn(
              "h-7 border px-2.5 text-xs font-medium transition-colors disabled:opacity-50",
              length === m ? "border-primary bg-primary text-primary-foreground" : "border-foreground/20 bg-card/70 text-muted-foreground hover:border-primary hover:bg-secondary",
            )}
          >
            {m} min
          </button>
        ))}
      </div>
      <div className="mt-5 flex justify-center gap-2">
        <Button
          onClick={() => {
            if (running) {
              setEndsAt(null);
            } else {
              const from = remaining === 0 ? length * 60 : remaining;
              setRemaining(from);
              setDone(false);
              setEndsAt(Date.now() + from * 1000);
            }
          }}
        >
          {running ? <Pause /> : <Play />} {running ? "Pause" : "Start"}
        </Button>
        <Button variant="outline" onClick={() => pick(length)}>
          <RotateCcw /> Reset
        </Button>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Finished sessions are saved. No pressure to finish one.</p>
    </div>
  );
}

/** Starter templates, folded away until wanted. */
function Templates({ today }: { today: string }) {
  const qc = useQueryClient();
  const [added, setAdded] = useState<TemplateId | null>(null);
  const apply = useMutation({
    mutationFn: (id: TemplateId) => applyTemplate(id, today),
    onSuccess: (_d, id) => {
      setAdded(id);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  return (
    <details className="group border bg-card/95 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 font-serif text-lg tracking-tight sm:px-6 [&::-webkit-details-marker]:hidden">
        <span>A gentle starting point</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-5 py-4 sm:px-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Pick a template for ideas. It adds a couple of tasks for today and two habits, and you can change every piece of it.
        </p>
        <div className="ruled sm:grid-cols-3">
          {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
            <div key={id} className="flex flex-col p-4">
              <p className="font-serif text-lg">{TEMPLATES[id].label}</p>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">{TEMPLATES[id].blurb}</p>
              <Button size="sm" variant="secondary" className="mt-3 self-start" disabled={apply.isPending} onClick={() => apply.mutate(id)}>
                {added === id ? "Added ✓" : "Use this"}
              </Button>
            </div>
          ))}
        </div>
        {apply.isError && <ErrorNote message={apply.error.message} />}
      </div>
    </details>
  );
}
