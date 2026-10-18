"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  ChevronDown,
  Flame,
  Footprints,
  Medal,
  Play,
  Route,
  Scale,
  Settings2,
  Smartphone,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { ChoicePills, Field } from "@/components/field";
import { StatTile } from "@/components/stat-tile";
import { EmptyState, ErrorNote, SectionTitle } from "@/components/page-header";
import { addDays, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ACTIVITIES, activity, showsPace, type ActivityId } from "./activities";
import {
  deleteSession,
  fetchFitnessOverview,
  fetchRoute,
  logWeight,
  updateTargets,
  type FitnessOverview,
  type FitnessTargets,
  type Session,
} from "./api";
import { DEFAULT_HEIGHT_CM, DEFAULT_WEIGHT_KG, formatDuration, formatKm, formatPace, paceOf, routePath } from "./engine";
import { useLiveWorkout, type LiveGoal } from "./live-store";
import { startWorkout, stopWorkout } from "./controls";
import { LiveView } from "./live-view";
import { FinishSheet, setReview, useReview } from "./finish-sheet";
import { ActivityRings, RingStat, type Ring } from "./rings";
import { requestMotionPermission, useSensors } from "./sensors";
import { setLiveMinimized, setStepCounter, useLiveMinimized, usePendingSteps, useStepCounter } from "./runtime";
import { activeStreak, activityMix, dayTotals, personalRecords, weekTotals } from "./stats";

const RING_COLORS = { move: "hsl(8 85% 62%)", exercise: "hsl(150 55% 48%)", steps: "hsl(205 85% 58%)" };

export function FitnessScreen({ today, profileId }: { today: string; profileId: string }) {
  const query = useQuery({ queryKey: ["fitness-tracker", today], queryFn: () => fetchFitnessOverview(today) });
  const live = useLiveWorkout();
  const minimized = useLiveMinimized();
  const review = useReview();
  const pending = usePendingSteps(today);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const data = query.data;
  const targets = data?.targets ?? null;

  return (
    <div className="space-y-6">
      {query.isError && <ErrorNote message={`Could not load your activity: ${query.error.message}`} onRetry={() => query.refetch()} />}

      <div className="ruled lg:grid-cols-[1.1fr_1fr]">
        <TodayRings data={data} today={today} pending={pending} profileId={profileId} />
        <StartPanel
          today={today}
          targets={targets}
          disabled={live !== null || review !== null}
          onResume={() => setLiveMinimized(false)}
        />
      </div>

      {data && <WeekTiles data={data} today={today} pending={pending} />}

      <div className="ruled lg:grid-cols-2">
        {data ? <WeekChart data={data} today={today} pending={pending} /> : <Card className="h-64 animate-pulse" />}
        <StepCounterCard targets={targets} today={today} pending={pending} data={data} />
      </div>

      {data && (
        <div className="ruled lg:grid-cols-2">
          <RecordsCard data={data} />
          <MixCard data={data} today={today} />
        </div>
      )}

      {data && <History data={data} today={today} onMessage={setToast} />}

      {data && (
        <div className="ruled">
          <BodyCard data={data} today={today} profileId={profileId} onMessage={setToast} />
        </div>
      )}

      <p className="text-[0.7rem] text-muted-foreground">
        Distance, steps and calories are estimates from your phone&apos;s sensors. For tracking only, not medical advice.
      </p>

      {live && !minimized && (
        <LiveView
          w={live}
          onFinish={() => {
            const summary = stopWorkout();
            if (summary) setReview(summary);
          }}
        />
      )}
      {review && !live && <FinishSheet w={review} onSaved={setToast} />}

      {toast && (
        <div role="status" className="animate-rise fixed inset-x-0 bottom-28 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-foreground px-5 py-2.5 text-sm text-background shadow-xl lg:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- today ----------

function TodayRings({ data, today, pending, profileId }: { data: FitnessOverview | undefined; today: string; pending: number; profileId: string }) {
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
    <Card className="fit-hero">
      <SectionTitle
        icon={Zap}
        title="Today"
        aside={
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)} disabled={!data}>
            <Settings2 /> Targets
          </Button>
        }
      />
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ActivityRings rings={rings} size={208} stroke={17}>
          <p className="font-serif text-4xl leading-none tabular-nums">{(t?.steps ?? 0).toLocaleString("en-IN")}</p>
          <p className="mt-1 text-[0.65rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">steps</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatKm(t?.distanceM ?? 0)} km</p>
        </ActivityRings>
        <div className="w-full flex-1 space-y-4">
          <RingStat ring={rings[0]} unit="kcal" icon={Flame} />
          <RingStat ring={rings[1]} unit="min" icon={Timer} />
          <RingStat ring={rings[2]} unit="steps" icon={Footprints} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
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

function StartPanel({ today, targets, disabled, onResume }: { today: string; targets: FitnessTargets | null; disabled: boolean; onResume: () => void }) {
  const live = useLiveWorkout();
  const [picked, setPicked] = useState<ActivityId>("walk");
  const [goal, setGoal] = useState<GoalKey>("open");
  const [starting, setStarting] = useState(false);
  const def = activity(picked);
  const goals = def.gps ? GPS_GOALS : TIME_GOALS;
  const goalValue = goals.some((g) => g.value === goal) ? goal : "open";

  return (
    <Card style={{ "--act": def.hue } as React.CSSProperties}>
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
                "flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-2.5 text-[0.7rem] font-semibold transition-all",
                on ? "fit-start scale-[1.04] border-transparent text-white" : "bg-background hover:-translate-y-0.5 hover:border-primary/40",
              )}
            >
              <Icon className="size-5" />
              {a.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold">Goal</p>
        <ChoicePills label="Workout goal" options={goals} value={goalValue} onChange={setGoal} />
      </div>

      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {def.gps && <span>• GPS distance, pace, route &amp; splits</span>}
        {def.steps && <span>• Step counter &amp; cadence</span>}
        <span>• Calories, laps &amp; heart-rate strap</span>
      </p>

      {live ? (
        <Button size="lg" className="fit-start h-14 w-full text-base text-white" style={{ "--act": activity(live.activity).hue } as React.CSSProperties} onClick={onResume}>
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
          className="fit-start group relative flex h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-full text-lg font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative flex size-10 items-center justify-center rounded-full bg-white/25">
            <Play className="size-5 fill-current" />
          </span>
          Start {def.label.toLowerCase()}
        </button>
      )}
    </Card>
  );
}

// ---------- week ----------

function WeekTiles({ data, today, pending }: { data: FitnessOverview; today: string; pending: number }) {
  const week = weekTotals(data, today, pending);
  const minutes = week.reduce((s, d) => s + d.activeMin, 0);
  const km = week.reduce((s, d) => s + d.distanceM, 0) / 1000;
  const monthStart = `${today.slice(0, 7)}-01`;
  const workouts = data.sessions.filter((s) => s.session_date >= monthStart).length;
  const streak = activeStreak(data, today, pending);
  return (
    <div className="ruled grid-cols-2 md:grid-cols-4">
      <StatTile tone="mint" icon={Timer} label="Active this week" value={minutes} unit="min" caption={`${Math.round(minutes / 7)} min a day on average`} />
      <StatTile tone="sky" icon={Route} label="Distance this week" value={km.toFixed(1)} unit="km" />
      <StatTile tone="peach" icon={Flame} label="Active streak" value={streak} unit={streak === 1 ? "day" : "days"} caption={streak ? "Keep it gentle" : "Today can be day one"} />
      <StatTile tone="lilac" icon={CalendarCheck} label="Workouts this month" value={workouts} />
    </div>
  );
}

function WeekChart({ data, today, pending }: { data: FitnessOverview; today: string; pending: number }) {
  const week = weekTotals(data, today, pending);
  const goal = data.targets.active_goal_min;
  const max = Math.max(goal * 1.25, ...week.map((d) => d.activeMin), 1);
  return (
    <Card>
      <SectionTitle icon={CalendarCheck} title="Your week" aside={<span className="text-xs text-muted-foreground">active minutes</span>} />
      <div className="relative h-44">
        <div className="absolute inset-x-0 border-t border-dashed border-chart-5" style={{ bottom: `${(goal / max) * 100}%` }}>
          <span className="absolute -top-2 left-0 z-10 rounded-full bg-card px-1.5 text-[0.6rem] leading-4 font-semibold text-chart-5">goal {goal}</span>
        </div>
        <div className="flex h-full items-end gap-2">
          {week.map((d, i) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[0.62rem] tabular-nums text-muted-foreground">{d.activeMin || ""}</span>
              <div
                className={cn(
                  "w-full max-w-10 rounded-t-xl transition-all duration-700",
                  d.activeMin >= goal ? "bg-chart-5" : "bg-chart-5/45",
                  d.date === today && "ring-2 ring-chart-5/40 ring-offset-2 ring-offset-card",
                )}
                style={{ height: `${Math.max(3, (d.activeMin / max) * 100)}%`, transitionDelay: `${i * 60}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        {week.map((d) => (
          <div key={d.date} className="flex-1 text-center">
            <p className={cn("text-[0.65rem] font-bold uppercase", d.date === today ? "text-primary" : "text-muted-foreground")}>
              {formatDate(d.date, { weekday: "narrow" })}
            </p>
            <p className="text-[0.6rem] text-muted-foreground tabular-nums">{d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps || "·"}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- all-day steps ----------

function StepCounterCard({ targets, today, pending, data }: { targets: FitnessTargets | null; today: string; pending: number; data: FitnessOverview | undefined }) {
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
    <Card>
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
      <div className="space-y-1.5 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">How background tracking works.</strong> Once a workout starts, it keeps recording
          on every Dovie screen, survives a closed app, and is saved even if you&apos;re offline.
        </p>
        <p>
          Browsers switch off GPS and motion sensors while a web app is closed or the screen is off, so distance and steps are
          measured while Dovie is open. Install Dovie to your home screen and the screen stays awake during workouts.
        </p>
      </div>
    </Card>
  );
}

// ---------- records & mix ----------

function RecordsCard({ data }: { data: FitnessOverview }) {
  const r = personalRecords(data);
  const rows = [
    r.longestDistance && { label: "Longest distance", value: `${formatKm(r.longestDistance.distance_m)} km`, when: r.longestDistance.session_date, id: r.longestDistance.activity },
    r.bestPace && { label: "Fastest pace (1 km+)", value: `${formatPace(r.bestPace.pace)} /km`, when: r.bestPace.session.session_date, id: r.bestPace.session.activity },
    r.longestTime && { label: "Longest workout", value: formatDuration(r.longestTime.duration_s), when: r.longestTime.session_date, id: r.longestTime.activity },
    r.mostCalories && { label: "Most calories", value: `${r.mostCalories.calories} kcal`, when: r.mostCalories.session_date, id: r.mostCalories.activity },
    r.bestStepsDay && { label: "Most steps in a day", value: r.bestStepsDay.steps.toLocaleString("en-IN"), when: r.bestStepsDay.date, id: "walk" },
  ].filter(Boolean) as { label: string; value: string; when: string; id: string }[];

  return (
    <Card>
      <SectionTitle icon={Medal} title="Personal bests" />
      {rows.length === 0 ? (
        <EmptyState title="Your first workout sets the bar." detail="Records appear here as you move." />
      ) : (
        <ul className="divide-y">
          {rows.map((row) => {
            const def = activity(row.id);
            const Icon = def.icon;
            return (
              <li key={row.label} className="flex items-center gap-3 py-2.5">
                <span className="flex size-9 items-center justify-center rounded-full text-white" style={{ background: `hsl(${def.hue} 70% 58%)` }}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">{row.label}</span>
                  <span className="block font-serif text-lg leading-tight tabular-nums">{row.value}</span>
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(row.when, { day: "numeric", month: "short" })}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function MixCard({ data, today }: { data: FitnessOverview; today: string }) {
  const mix = activityMix(data, today);
  const total = mix.reduce((s, m) => s + m.minutes, 0);
  return (
    <Card>
      <SectionTitle icon={Zap} title="Last 30 days" aside={<span className="text-xs text-muted-foreground">{Math.round(total)} min total</span>} />
      {mix.length === 0 ? (
        <EmptyState title="Nothing recorded yet." detail="Your mix of walks, runs and the rest will show here." />
      ) : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full">
            {mix.map((m) => (
              <div key={m.id} style={{ width: `${(m.minutes / total) * 100}%`, background: `hsl(${activity(m.id).hue} 70% 60%)` }} />
            ))}
          </div>
          <ul className="space-y-2">
            {mix.map((m) => {
              const def = activity(m.id);
              const Icon = def.icon;
              return (
                <li key={m.id} className="flex items-center gap-2.5 text-sm">
                  <span style={{ color: `hsl(${def.hue} 65% 50%)` }}>
                    <Icon className="size-4" />
                  </span>
                  <span className="flex-1">{def.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.count}× · {Math.round(m.minutes)} min
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

// ---------- history ----------

function History({ data, today, onMessage }: { data: FitnessOverview; today: string; onMessage: (m: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? data.sessions : data.sessions.slice(0, 8);
  return (
    <div className="ruled">
      <Card>
        <SectionTitle icon={Route} title="Workout history" aside={<span className="text-xs text-muted-foreground">{data.sessions.length} in 4 months</span>} />
        {data.sessions.length === 0 ? (
          <EmptyState title="No workouts yet." detail="Pick an activity above and press start. Dovie handles the rest." />
        ) : (
          <ul className="divide-y">
            {list.map((s) => (
              <SessionRow key={s.id} s={s} today={today} onMessage={onMessage} />
            ))}
          </ul>
        )}
        {data.sessions.length > 8 && (
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show all ${data.sessions.length}`}
          </Button>
        )}
      </Card>
    </div>
  );
}

function SessionRow({ s, today, onMessage }: { s: Session; today: string; onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const def = activity(s.activity);
  const Icon = def.icon;
  const pace = paceOf(s.distance_m, s.duration_s);
  const route = useQuery({ queryKey: ["fitness-route", s.id], queryFn: () => fetchRoute(s.id), enabled: open && s.distance_m > 0, staleTime: Infinity });
  const remove = useMutation({
    mutationFn: () => deleteSession(s.id),
    onSuccess: () => onMessage("Workout deleted."),
    onError: (e) => onMessage(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["fitness-tracker"] }),
  });
  const path = route.data ? routePath(route.data, 320, 120) : "";
  const when = relativeDay(s.session_date, today);

  return (
    <li className="py-3">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, hsl(${def.hue} 72% 55%), hsl(${def.hue + 35} 78% 62%))` }}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {def.label}
            {s.distance_m >= 50 && ` · ${formatKm(s.distance_m)} km`}
          </span>
          <span className="block text-xs text-muted-foreground">
            {when === "today" || when === "yesterday" ? when[0].toUpperCase() + when.slice(1) : formatDate(s.session_date, { weekday: "short", day: "numeric", month: "short" })}
            {" · "}
            {new Date(s.started_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
          </span>
        </span>
        <span className="text-right text-xs text-muted-foreground tabular-nums">
          <span className="block font-mono text-sm text-foreground">{formatDuration(s.duration_s)}</span>
          {showsPace(s.activity) && pace ? `${formatPace(pace)} /km` : `${s.calories} kcal`}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="animate-rise mt-3 space-y-3 pl-14">
          <dl className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
            {[
              ["Calories", `${s.calories} kcal`],
              s.steps > 0 && ["Steps", s.steps.toLocaleString("en-IN")],
              s.avg_hr && ["Avg HR", `${s.avg_hr} bpm`],
              s.max_hr && ["Max HR", `${s.max_hr} bpm`],
              s.elevation_gain_m && ["Climb", `${Math.round(s.elevation_gain_m)} m`],
              s.effort && ["Effort", ["Easy", "Steady", "Solid", "Hard", "All out"][s.effort - 1]],
              s.distance_m > 0 && !showsPace(s.activity) && ["Avg speed", `${((s.distance_m / s.duration_s) * 3.6).toFixed(1)} km/h`],
            ]
              .filter((x): x is [string, string] => Array.isArray(x))
              .map(([k, v]) => (
                <div key={k} className="rounded-xl bg-muted/60 p-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
          </dl>
          {path && (
            <svg viewBox="0 0 320 120" className="h-28 w-full rounded-2xl bg-muted/50" aria-label="Route">
              <path d={path} fill="none" stroke={`hsl(${def.hue} 70% 55%)`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {s.splits && s.splits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {s.splits.map((t, i) => (
                <span key={i} className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[0.68rem] text-secondary-foreground">
                  km {i + 1} · {formatPace(t)}
                </span>
              ))}
            </div>
          )}
          {s.note && <p className="border-l-2 border-primary/40 pl-2 text-sm italic">{s.note}</p>}
          {confirming ? (
            <div className="flex items-center gap-2 text-sm">
              Delete this workout?
              <Button size="xs" variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
                Delete
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => setConfirming(true)}>
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

// ---------- body ----------

function BodyCard({ data, today, profileId, onMessage }: { data: FitnessOverview; today: string; profileId: string; onMessage: (m: string) => void }) {
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
    <Card>
      <SectionTitle icon={Scale} title="Body" aside={<span className="text-xs text-muted-foreground">used for calorie estimates</span>} />
      <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <div className="flex items-end gap-4">
            <p className="font-serif text-5xl leading-none tabular-nums">
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
            <svg viewBox={`0 -4 ${W} ${H + 8}`} className="h-24 w-full" aria-label="Weight trend" preserveAspectRatio="none">
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
