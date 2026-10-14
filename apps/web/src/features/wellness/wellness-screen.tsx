"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BatteryMedium, Droplets, Footprints, Moon, Pause, Play, RotateCcw, Sprout, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { Input } from "@/components/ui/input";
import { ChoicePills, Field } from "@/components/field";
import { ErrorNote, SectionTitle } from "@/components/page-header";
import { MOODS } from "@/features/checkin/mood";
import { cn } from "@/lib/utils";
import { TEMPLATES, applyTemplate, type TemplateId } from "./api";
import { useWellness } from "./use-wellness";

const ENERGY = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }));

export function WellnessScreen({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const w = useWellness(today, setError);
  const day = w.query.data;

  if (w.query.isPending) return <p className="text-sm text-muted-foreground">Getting today ready…</p>;
  if (w.query.isError) return <ErrorNote message={w.query.error.message} onRetry={() => w.query.refetch()} />;

  const tiles = [
    { label: "Sleep", value: day?.sleep_hours ?? "—", unit: "hours", icon: Moon, tone: "sky" },
    { label: "Water", value: day?.water_glasses ?? 0, unit: "glasses", icon: Droplets, tone: "mint" },
    { label: "Energy", value: day?.energy ?? "—", unit: "of 5", icon: BatteryMedium, tone: "butter" },
    { label: "Movement", value: day?.movement_minutes ?? 0, unit: "min", icon: Footprints, tone: "peach" },
  ] as const;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}
      <div className="ruled grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <StatTile key={t.label} icon={t.icon} label={t.label} value={t.value} unit={t.unit} tone={t.tone} />
        ))}
      </div>

      <div className="ruled lg:grid-cols-2">
        {day && <FeelingForm key={today} day={day} onSave={(v) => w.save.mutate(v)} saving={w.save.isPending} />}
        <FocusTimer onComplete={(m) => w.focus.mutate(m)} todayMinutes={day?.focus_minutes ?? 0} />
        <Templates today={today} />
      </div>
    </div>
  );
}

function FeelingForm({
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
    <Card>
      <SectionTitle icon={Sprout} title="How are you feeling?" />
      <form
        className="space-y-4"
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sleep last night (hours)">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step={0.5}
              value={sleep}
              aria-invalid={!sleepValid}
              onChange={(e) => setSleep(e.target.value)}
            />
          </Field>
          <div className="text-xs font-semibold">
            Water today (glasses)
            <div className="mt-1.5 flex h-10 items-center justify-between rounded-xl border px-2 font-normal">
              <button
                type="button"
                className="rounded-md px-2 text-lg"
                aria-label="One less glass"
                onClick={() => setWater((n) => Math.max(0, n - 1))}
              >
                −
              </button>
              <span className="text-sm">{water}</span>
              <button
                type="button"
                className="rounded-md px-2 text-lg"
                aria-label="One more glass"
                onClick={() => setWater((n) => Math.min(40, n + 1))}
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold">Energy, from 1 to 5</p>
          <ChoicePills label="Energy" options={ENERGY} value={energy} onChange={setEnergy} />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold">Mood, only if it helps</p>
          <ChoicePills label="Mood" options={MOODS} value={mood} onChange={setMood} />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !sleepValid}>
            Save how I&apos;m doing
          </Button>
          {saved && !saving && <span className="text-xs text-primary">Saved. Thank you for checking in.</span>}
        </div>
      </form>
    </Card>
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
    <Card className="border-t-2 border-t-chart-3">
      <SectionTitle icon={Timer} title="A little focus" aside={<span className="text-xs opacity-80">{todayMinutes} min today</span>} />
      <p className="text-sm opacity-80">Take a breath. Give one thing a little attention.</p>
      <div className="my-4 text-center font-serif text-6xl tabular-nums" aria-live="polite">
        {mm}:{ss}
      </div>
      {done && <p className="mb-3 text-center text-sm">Focus time is complete. Take a kind little break.</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            disabled={running}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
              length === m ? "bg-card text-foreground" : "bg-card/50",
            )}
          >
            {m} min
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-2">
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
      <p className="mt-3 text-center text-xs opacity-70">Finished sessions are saved. No pressure to finish one.</p>
    </Card>
  );
}

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
    <Card className="lg:col-span-2">
      <SectionTitle icon={Sprout} title="A gentle starting point" />
      <p className="mb-4 text-sm text-muted-foreground">
        Pick a template for ideas. It adds a couple of tasks for today and two habits, and you can change every piece of it.
      </p>
      <div className="ruled sm:grid-cols-3">
        {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
          <div key={id} className="flex flex-col p-4">
            <p className="font-serif text-lg">{TEMPLATES[id].label}</p>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{TEMPLATES[id].blurb}</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 self-start"
              disabled={apply.isPending}
              onClick={() => apply.mutate(id)}
            >
              {added === id ? "Added ✓" : "Use this"}
            </Button>
          </div>
        ))}
      </div>
      {apply.isError && <ErrorNote message={apply.error.message} />}
    </Card>
  );
}
