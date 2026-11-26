"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flame, Footprints, Play, Settings2, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { ChoicePills, Field } from "@/components/field";
import { ErrorNote, SectionTitle } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { ACTIVITIES, activity, type ActivityId } from "./activities";
import { updateTargets, type FitnessOverview, type FitnessTargets } from "./api";
import { DEFAULT_HEIGHT_CM, DEFAULT_WEIGHT_KG, formatKm } from "./engine";
import { useLiveWorkout, type LiveGoal } from "./live-store";
import { startWorkout } from "./controls";
import { ActivityRings, RingStat, type Ring } from "./rings";
import { setLiveMinimized, setStepCounter, useStepCounter } from "./runtime";
import { dayTotals } from "./stats";
import { RING_COLORS, dense } from "./screen-shared";

// ---------- today ----------

export function TodayRings({ data, today, pending, profileId }: { data: FitnessOverview | undefined; today: string; pending: number; profileId: string }) {
  const [editing, setEditing] = useState(false);
  const t = data ? dayTotals(data, today, pending) : null;
  const goals = data?.targets ?? { move_goal_kcal: 400, active_goal_min: 30, step_goal: 8000 };
  const rings: Ring[] = [
    { label: "Move", value: t?.kcal ?? 0, goal: goals.move_goal_kcal, color: RING_COLORS.move },
    { label: "Exercise", value: t?.activeMin ?? 0, goal: goals.active_goal_min, color: RING_COLORS.exercise },
    { label: "Steps", value: t?.steps ?? 0, goal: goals.step_goal, color: RING_COLORS.steps },
  ];
  const closed = rings.filter((r) => r.value >= r.goal).length;

  return (
    <Card className={cn("fit-hero", dense)}>
      <SectionTitle
        icon={Zap}
        title="Today"
        aside={
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)} disabled={!data}>
            <Settings2 /> Targets
          </Button>
        }
      />
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <ActivityRings rings={rings} size={176} stroke={15}>
          <p className="font-serif text-3xl leading-none tabular-nums">{(t?.steps ?? 0).toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[0.65rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">steps</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatKm(t?.distanceM ?? 0)} km</p>
        </ActivityRings>
        <div className="w-full flex-1 space-y-3">
          <RingStat ring={rings[0]} unit="kcal" icon={Flame} />
          <RingStat ring={rings[1]} unit="min" icon={Timer} />
          <RingStat ring={rings[2]} unit="steps" icon={Footprints} />
        </div>
      </div>
      <p className="font-hand text-xl leading-snug">
        {closed === 3
          ? "All three rings closed. That's a full day of moving."
          : closed > 0
            ? `${closed} of 3 rings closed. Any movement from here is a bonus.`
            : "Every ring starts at zero. A short walk counts."}
      </p>
      {data && <TargetsModal open={editing} onClose={() => setEditing(false)} targets={data.targets} profileId={profileId} />}
    </Card>
  );
}

// ---------- start a workout ----------

type GoalKey = "open" | `t${number}` | `d${number}`;

const GPS_GOALS: { value: GoalKey; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "t20", label: "20 min" },
  { value: "t30", label: "30 min" },
  { value: "t45", label: "45 min" },
  { value: "d1", label: "1 km" },
  { value: "d3", label: "3 km" },
  { value: "d5", label: "5 km" },
  { value: "d10", label: "10 km" },
];

const TIME_GOALS: { value: GoalKey; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "t10", label: "10 min" },
  { value: "t20", label: "20 min" },
  { value: "t30", label: "30 min" },
  { value: "t45", label: "45 min" },
  { value: "t60", label: "1 hour" },
];

function toGoal(key: GoalKey): LiveGoal {
  if (key === "open") return null;
  const n = Number(key.slice(1));
  return key[0] === "t" ? { kind: "time", seconds: n * 60 } : { kind: "distance", metres: n * 1000 };
}

export function StartPanel({ today, targets, disabled, onResume }: { today: string; targets: FitnessTargets | null; disabled: boolean; onResume: () => void }) {
  const live = useLiveWorkout();
  const [picked, setPicked] = useState<ActivityId>("walk");
  const [goal, setGoal] = useState<GoalKey>("open");
  const [starting, setStarting] = useState(false);
  const def = activity(picked);
  const goals = def.gps ? GPS_GOALS : TIME_GOALS;
  const goalValue = goals.some((g) => g.value === goal) ? goal : "open";

  return (
    <Card className={dense} style={{ "--act": def.hue } as React.CSSProperties}>
      <SectionTitle icon={Play} title="Start a workout" />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6" role="radiogroup" aria-label="Activity">
        {ACTIVITIES.map((a) => {
          const Icon = a.icon;
          const on = a.id === picked;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPicked(a.id)}
              style={{ "--act": a.hue } as React.CSSProperties}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 text-[0.7rem] font-semibold transition-all",
                on ? "fit-start scale-[1.04] border-transparent text-white" : "bg-background hover:-translate-y-0.5 hover:border-primary/40",
              )}
            >
              <Icon className="size-5" />
              {a.label}
            </button>
          );
        })}
      </div>

      <ChoicePills label="Workout goal" options={goals} value={goalValue} onChange={setGoal} />

      {live ? (
        <Button size="lg" className="fit-start h-12 w-full text-base text-white" style={{ "--act": activity(live.activity).hue } as React.CSSProperties} onClick={onResume}>
          <Play className="fill-current" /> Back to your {activity(live.activity).label.toLowerCase()}
        </Button>
      ) : (
        <button
          type="button"
          disabled={disabled || starting}
          onClick={async () => {
            setStarting(true);
            await startWorkout(picked, today, toGoal(goalValue), {
              weightKg: targets?.weight_kg ?? DEFAULT_WEIGHT_KG,
              heightCm: targets?.height_cm ?? DEFAULT_HEIGHT_CM,
            });
            setLiveMinimized(false);
            setStarting(false);
          }}
          className="fit-start group relative flex h-13 w-full items-center justify-center gap-3 overflow-hidden rounded-full text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative flex size-8 items-center justify-center rounded-full bg-white/25">
            <Play className="size-5 fill-current" />
          </span>
          Start {def.label.toLowerCase()}
        </button>
      )}
    </Card>
  );
}

// ---------- targets ----------

function TargetsModal({ open, onClose, targets, profileId }: { open: boolean; onClose: () => void; targets: FitnessTargets; profileId: string }) {
  const qc = useQueryClient();
  const [steps, setSteps] = useState(String(targets.step_goal));
  const [minutes, setMinutes] = useState(String(targets.active_goal_min));
  const [kcal, setKcal] = useState(String(targets.move_goal_kcal));
  const [height, setHeight] = useState(targets.height_cm ? String(targets.height_cm) : "");
  const [error, setError] = useState<string | null>(null);
  const counter = useStepCounter();

  const n = (v: string) => Math.round(Number(v));
  const valid =
    n(steps) >= 500 && n(steps) <= 100000 && n(minutes) >= 5 && n(minutes) <= 600 && n(kcal) >= 50 && n(kcal) <= 5000 &&
    (height === "" || (Number(height) >= 80 && Number(height) <= 250));

  const save = useMutation({
    mutationFn: () =>
      updateTargets(profileId, {
        step_goal: n(steps),
        active_goal_min: n(minutes),
        move_goal_kcal: n(kcal),
        height_cm: height === "" ? null : Math.round(Number(height) * 10) / 10,
      }),
    onSuccess: () => {
      if (height !== "") setStepCounter({ ...counter, heightCm: Number(height) });
      onClose();
    },
    onError: (e) => setError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["fitness-tracker"] }),
  });

  return (
    <Modal open={open} title="Your daily targets" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save.mutate();
        }}
      >
        <div className="grid grid-cols-3 gap-3">
          <Field label="Steps">
            <Input type="number" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} />
          </Field>
          <Field label="Active min">
            <Input type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
          <Field label="Move kcal">
            <Input type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </Field>
        </div>
        <Field label="Height (cm)" hint="Sets your stride length for step distance. Log weight on the Body card.">
          <Input type="number" inputMode="decimal" placeholder="e.g. 168" value={height} onChange={(e) => setHeight(e.target.value)} />
        </Field>
        {error && <ErrorNote message={error} />}
        <Button type="submit" size="lg" className="w-full" disabled={!valid || save.isPending}>
          Save targets
        </Button>
      </form>
    </Modal>
  );
}
