"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChevronDown, Flame, Medal, Route, Timer, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sticky, StickyValue } from "@/components/notebook";
import { EmptyState, SectionTitle } from "@/components/page-header";
import { formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { activity, showsPace } from "./activities";
import { deleteSession, fetchRoute, type FitnessOverview, type Session } from "./api";
import { formatDuration, formatKm, formatPace, paceOf, routePath } from "./engine";
import { activeStreak, activityMix, personalRecords, weekTotals } from "./stats";
import { dense } from "./screen-shared";

// ---------- week ----------

export function WeekNotes({ data, today, pending }: { data: FitnessOverview; today: string; pending: number }) {
  const week = weekTotals(data, today, pending);
  const minutes = week.reduce((s, d) => s + d.activeMin, 0);
  const km = week.reduce((s, d) => s + d.distanceM, 0) / 1000;
  const monthStart = `${today.slice(0, 7)}-01`;
  const workouts = data.sessions.filter((s) => s.session_date >= monthStart).length;
  const streak = activeStreak(data, today, pending);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 md:grid-cols-4">
      <Sticky
        label="Active"
        icon={Timer}
        caption={`~${Math.round(minutes / 7)} min a day this week`}
        tilt="-rotate-1 [--tape-tilt:-4deg]"
        tone="bg-mint text-mint-foreground"
      >
        <StickyValue value={minutes} unit="min" />
      </Sticky>
      <Sticky label="Distance" icon={Route} caption="this week" tilt="rotate-1 [--tape-tilt:3deg]" tone="bg-sky text-sky-foreground">
        <StickyValue value={km.toFixed(1)} unit="km" />
      </Sticky>
      <Sticky
        label="Streak"
        icon={Flame}
        caption={streak ? "keep it gentle" : "today can be day one"}
        tilt="-rotate-[0.5deg] [--tape-tilt:-2deg]"
        tone="bg-butter text-butter-foreground"
      >
        <StickyValue value={streak} unit={streak === 1 ? "day" : "days"} />
      </Sticky>
      <Sticky
        label="Workouts"
        icon={CalendarCheck}
        caption={`in ${formatDate(today, { month: "long" })}`}
        tilt="rotate-[1.5deg] [--tape-tilt:4deg]"
        tone="bg-secondary text-secondary-foreground"
      >
        <StickyValue value={workouts} />
      </Sticky>
    </div>
  );
}

export function WeekChart({ data, today, pending }: { data: FitnessOverview; today: string; pending: number }) {
  const week = weekTotals(data, today, pending);
  const goal = data.targets.active_goal_min;
  const max = Math.max(goal * 1.25, ...week.map((d) => d.activeMin), 1);
  return (
    <Card className={dense}>
      <SectionTitle icon={CalendarCheck} title="Your week" aside={<span className="text-xs text-muted-foreground">active minutes</span>} />
      <div className="relative h-36">
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

// ---------- records & mix ----------

export function RecordsCard({ data }: { data: FitnessOverview }) {
  const r = personalRecords(data);
  const rows = [
    r.longestDistance && { label: "Longest distance", value: `${formatKm(r.longestDistance.distance_m)} km`, when: r.longestDistance.session_date, id: r.longestDistance.activity },
    r.bestPace && { label: "Fastest pace (1 km+)", value: `${formatPace(r.bestPace.pace)} /km`, when: r.bestPace.session.session_date, id: r.bestPace.session.activity },
    r.longestTime && { label: "Longest workout", value: formatDuration(r.longestTime.duration_s), when: r.longestTime.session_date, id: r.longestTime.activity },
    r.mostCalories && { label: "Most calories", value: `${r.mostCalories.calories} kcal`, when: r.mostCalories.session_date, id: r.mostCalories.activity },
    r.bestStepsDay && { label: "Most steps in a day", value: r.bestStepsDay.steps.toLocaleString("en-IN"), when: r.bestStepsDay.date, id: "walk" },
  ].filter(Boolean) as { label: string; value: string; when: string; id: string }[];

  return (
    <Card className={dense}>
      <SectionTitle icon={Medal} title="Personal bests" />
      {rows.length === 0 ? (
        <EmptyState title="Your first workout sets the bar." detail="Records appear here as you move." />
      ) : (
        <ul className="divide-y">
          {rows.map((row) => {
            const def = activity(row.id);
            const Icon = def.icon;
            return (
              <li key={row.label} className="flex items-center gap-3 py-2">
                <span className="flex size-8 items-center justify-center rounded-full text-white" style={{ background: `hsl(${def.hue} 70% 58%)` }}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">{row.label}</span>
                  <span className="block font-serif text-base leading-tight tabular-nums">{row.value}</span>
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

export function MixCard({ data, today }: { data: FitnessOverview; today: string }) {
  const mix = activityMix(data, today);
  const total = mix.reduce((s, m) => s + m.minutes, 0);
  return (
    <Card className={dense}>
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
          <ul className="space-y-1.5">
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

export function History({ data, today, onMessage }: { data: FitnessOverview; today: string; onMessage: (m: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? data.sessions : data.sessions.slice(0, 6);
  return (
    <Card className={dense}>
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
        {data.sessions.length > 6 && (
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show all ${data.sessions.length}`}
          </Button>
        )}
    </Card>
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
    <li className="py-2">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, hsl(${def.hue} 72% 55%), hsl(${def.hue + 35} 78% 62%))` }}>
          <Icon className="size-4" />
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
        <div className="animate-rise mt-2.5 space-y-2.5 pl-12">
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
