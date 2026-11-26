"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Scale, Smartphone, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/components/page-header";
import { addDays } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { logWeight, type FitnessOverview, type FitnessTargets } from "./api";
import { DEFAULT_HEIGHT_CM } from "./engine";
import { useLiveWorkout } from "./live-store";
import { requestMotionPermission, useSensors } from "./sensors";
import { setStepCounter, useStepCounter } from "./runtime";
import { dense } from "./screen-shared";

// ---------- all-day steps ----------

export function StepCounterCard({ targets, today, pending, data }: { targets: FitnessTargets | null; today: string; pending: number; data: FitnessOverview | undefined }) {
  const counter = useStepCounter();
  const sensors = useSensors();
  const live = useLiveWorkout();
  const synced = data?.days.find((d) => d.activity_date === today)?.steps ?? 0;
  const status = !counter.enabled
    ? "Off"
    : live
      ? "Paused during your workout (its steps count there)"
      : sensors.motion === "ok"
        ? "Counting now"
        : sensors.motion === "denied"
          ? "Motion access is blocked in your browser settings"
          : sensors.motion === "unavailable"
            ? "This device has no motion sensor"
            : "Waiting for movement…";

  return (
    <Card className={dense}>
      <SectionTitle icon={Smartphone} title="All-day step counter" />
      <div className="flex items-center gap-4">
        <button
          type="button"
          role="switch"
          aria-checked={counter.enabled}
          aria-label="All-day step counter"
          onClick={async () => {
            if (counter.enabled) return setStepCounter({ ...counter, enabled: false });
            await requestMotionPermission();
            setStepCounter({ enabled: true, heightCm: targets?.height_cm ?? DEFAULT_HEIGHT_CM });
          }}
          className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors", counter.enabled ? "bg-chart-4" : "bg-muted")}
        >
          <span className={cn("absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform", counter.enabled && "translate-x-6")} />
        </button>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {counter.enabled && sensors.motion === "ok" && !live && <span className="size-2 animate-pulse rounded-full bg-chart-4" />}
            {status}
          </p>
          <p className="text-xs text-muted-foreground">
            {(synced + pending).toLocaleString("en-IN")} steps counted on this device today
            {pending > 0 && ` · ${pending} waiting to sync`}
          </p>
        </div>
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer font-semibold text-primary">How background tracking works</summary>
        <div className="mt-2 space-y-1.5 rounded-2xl bg-muted/60 p-3">
        <p>
          Once a workout starts, it keeps recording
          on every Dovie screen, survives a closed app, and is saved even if you&apos;re offline.
        </p>
        <p>
          Browsers switch off GPS and motion sensors while a web app is closed or the screen is off, so distance and steps are
          measured while Dovie is open. Install Dovie to your home screen and the screen stays awake during workouts.
        </p>
        </div>
      </details>
    </Card>
  );
}

// ---------- body ----------

export function BodyCard({ data, today, profileId, onMessage }: { data: FitnessOverview; today: string; profileId: string; onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const [kg, setKg] = useState("");
  const parsed = Number(kg);
  const valid = kg !== "" && parsed >= 20 && parsed <= 350;
  const log = useMutation({
    mutationFn: () => logWeight(profileId, today, Math.round(parsed * 10) / 10),
    onSuccess: () => {
      setKg("");
      onMessage("Weight logged.");
    },
    onError: (e) => onMessage(e.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["fitness-tracker"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const logs = data.body;
  const latest = logs[logs.length - 1]?.weight_kg ?? data.targets.weight_kg;
  const monthAgo = logs.find((l) => l.log_date >= addDays(today, -30));
  const change = latest && monthAgo && logs.length > 1 ? latest - monthAgo.weight_kg : null;
  const h = data.targets.height_cm;
  const bmi = latest && h ? latest / (h / 100) ** 2 : null;

  const W = 320;
  const H = 70;
  let spark = "";
  if (logs.length > 1) {
    const vals = logs.map((l) => l.weight_kg);
    const lo = Math.min(...vals) - 0.5;
    const hi = Math.max(...vals) + 0.5;
    spark = vals.map((v, i) => `${i ? "L" : "M"}${((i / (vals.length - 1)) * W).toFixed(1)},${(H - ((v - lo) / (hi - lo)) * H).toFixed(1)}`).join(" ");
  }

  return (
    <Card className={dense}>
      <SectionTitle icon={Scale} title="Body" aside={<span className="text-xs text-muted-foreground">used for calorie estimates</span>} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          <div className="flex items-end gap-4">
            <p className="font-serif text-4xl leading-none tabular-nums">
              {latest ?? "–"}
              <span className="ml-1 font-sans text-sm text-muted-foreground">kg</span>
            </p>
            {change !== null && Math.abs(change) >= 0.1 && (
              <p className="flex items-center gap-1 pb-1 text-sm text-muted-foreground">
                {change > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {Math.abs(change).toFixed(1)} kg in 30 days
              </p>
            )}
          </div>
          {bmi && <p className="text-xs text-muted-foreground">BMI {bmi.toFixed(1)} (from your height; a rough guide only)</p>}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) log.mutate();
            }}
          >
            <Input type="number" inputMode="decimal" step="0.1" min={20} max={350} placeholder="Today's weight (kg)" value={kg} onChange={(e) => setKg(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={!valid || log.isPending}>
              Log
            </Button>
          </form>
        </div>
        <div className="flex items-center">
          {spark ? (
            <svg viewBox={`0 -4 ${W} ${H + 8}`} className="h-20 w-full" aria-label="Weight trend" preserveAspectRatio="none">
              <path d={spark} fill="none" stroke="var(--chart-3)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <p className="text-sm text-muted-foreground">Log your weight now and then to see a gentle trend line here.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
