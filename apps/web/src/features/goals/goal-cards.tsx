"use client";

import { CalendarDays, Check, History, Pencil, Pin, PinOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/page-header";
import { Slip } from "@/components/notebook";
import { formatAmount } from "@/features/fitness/format";
import { addDays, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { AREAS, HISTORY_DAYS, type Goal, type GoalLog, type Milestone } from "./api";
import { isDone, pace, ratio, spark } from "./pace";
import { AREA_TONE, PacePill, Ring, Spark, amount, count, paceLine } from "./goal-parts";

export function FocusCard({
  goal: g,
  today,
  logs,
  milestones,
  advanced,
  onStep,
  onLog,
  onOpen,
  onUnpin,
  onToggleMilestone,
}: {
  goal: Goal;
  today: string;
  logs: GoalLog[];
  milestones: Milestone[];
  advanced: boolean;
  onStep: () => void;
  onLog: () => void;
  onOpen: () => void;
  onUnpin: () => void;
  onToggleMilestone: (m: Milestone) => void;
}) {
  const r = ratio(g);
  const p = pace(g, logs, today);
  const next = milestones.filter((m) => !m.done_at).slice(0, 3);
  return (
    <Slip className="relative overflow-hidden p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-blush opacity-70 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-[0.14em] text-secondary-foreground uppercase">
            <Pin className="size-3" /> {g.pinned ? "Your focus" : "In motion"}
          </p>
          <div className="flex items-center gap-1">
            {p.status !== "open" && <PacePill status={p.status} />}
            {g.pinned && (
              <Button size="icon-xs" variant="ghost" aria-label="Unpin" title="Unpin" onClick={onUnpin}>
                <PinOff />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Ring value={r} size={112} stroke={10}>
            <div className="text-center">
              <p className="font-serif text-3xl leading-none">{r === null ? formatAmount(g.current_value) : `${Math.round(r * 100)}%`}</p>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">{r === null ? (g.unit ?? "so far") : "there"}</p>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={onOpen} className="text-left font-serif text-2xl leading-tight tracking-tight hover:underline">
              {g.title}
            </button>
            {g.why && <p className="mt-1 font-hand text-xl leading-tight text-muted-foreground">because {g.why}</p>}
            <p className="mt-2 text-sm">
              {amount(g.current_value, g.unit)}
              {g.target_value ? <span className="text-muted-foreground"> of {formatAmount(g.target_value)}</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">{paceLine(g, p, today)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="solid" onClick={onStep}>
            <Plus /> {amount(g.step, g.unit)}
          </Button>
          <Button variant="outline" onClick={onLog}>
            <Pencil /> Log with a note
          </Button>
          <Button variant="ghost" onClick={onOpen}>
            <History /> Details
          </Button>
        </div>

        {advanced && (next.length > 0 || milestones.length > 0) && (
          <div className="mt-5 border-t border-dashed pt-3">
            <p className="mb-2 font-hand text-lg leading-none text-muted-foreground">
              next stops · {milestones.filter((m) => m.done_at).length}/{milestones.length} done
            </p>
            <ul className="space-y-1">
              {next.map((m) => (
                <li key={m.id}>
                  <MilestoneCheck milestone={m} onToggle={() => onToggleMilestone(m)} />
                </li>
              ))}
              {next.length === 0 && <li className="text-sm text-muted-foreground">Every milestone ticked off.</li>}
            </ul>
          </div>
        )}
      </div>
    </Slip>
  );
}

export function MilestoneCheck({ milestone: m, onToggle }: { milestone: Milestone; onToggle: () => void }) {
  const done = !!m.done_at;
  return (
    <button type="button" role="checkbox" aria-checked={done} onClick={onToggle} className="group flex w-full items-center gap-2 text-left text-sm">
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "group-hover:border-primary",
        )}
      >
        {done && <Check className="size-3" />}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", done && "text-muted-foreground line-through")}>{m.title}</span>
    </button>
  );
}

export function GoalCard({
  goal: g,
  today,
  logs,
  milestones,
  advanced,
  onStep,
  onLog,
  onOpen,
  onPin,
}: {
  goal: Goal;
  today: string;
  logs: GoalLog[];
  milestones: Milestone[];
  advanced: boolean;
  onStep: () => void;
  onLog: () => void;
  onOpen: () => void;
  onPin: () => void;
}) {
  const r = ratio(g);
  const p = pace(g, logs, today);
  const done = isDone(g);
  const msDone = milestones.filter((m) => m.done_at).length;
  return (
    <li className="group flex flex-col gap-3 border bg-card p-4 transition-shadow hover:shadow-soft">
      <div className="flex items-start gap-3">
        <Ring value={r ?? (done ? 1 : null)} size={48} stroke={5}>
          <span className="text-[0.7rem] font-semibold tabular-nums">{r === null ? formatAmount(g.current_value) : `${Math.round(r * 100)}%`}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            {g.area && (
              <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", AREA_TONE[g.area])}>
                {AREAS.find((a) => a.value === g.area)?.label}
              </span>
            )}
            {p.status !== "open" && <PacePill status={p.status} />}
          </div>
          <button type="button" onClick={onOpen} className="block max-w-full text-left font-medium break-words hover:underline">
            {g.title}
          </button>
          <p className="text-xs text-muted-foreground">
            {amount(g.current_value, g.unit)}
            {g.target_value ? ` of ${formatAmount(g.target_value)}` : ""}
            {advanced && milestones.length > 0 && ` · ${msDone}/${milestones.length} milestones`}
          </p>
        </div>
        {advanced && !done && (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Make ${g.title} your focus`}
            title="Make this your focus"
            onClick={onPin}
            className="text-muted-foreground [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Pin />
          </Button>
        )}
      </div>
      {advanced && <Spark values={spark(g.id, logs, today)} />}
      <p className="text-xs text-muted-foreground">{paceLine(g, p, today)}</p>
      {!done && (
        <div className="mt-auto flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={onStep} aria-label={`Add ${amount(g.step, g.unit)} to ${g.title}`}>
            <Plus /> {amount(g.step, g.unit)}
          </Button>
          <Button size="sm" variant="ghost" onClick={onLog}>
            Log…
          </Button>
        </div>
      )}
    </li>
  );
}

/** Sixteen weeks of steps across every goal, one square a day. */
export function Heatmap({ logs, today, goals }: { logs: GoalLog[]; today: string; goals: Goal[] }) {
  const counts = new Map<string, number>();
  for (const l of logs) if (l.amount > 0) counts.set(l.log_date, (counts.get(l.log_date) ?? 0) + 1);
  const weeks = HISTORY_DAYS / 7;
  // End on this week's Sunday so columns are whole Monday-to-Sunday weeks.
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(today, -weekday - (weeks - 1) * 7);
  const max = Math.max(1, ...counts.values());
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  const activeDays = counts.size;
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  const tone = ["bg-muted", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"];
  const recent = logs.slice(0, 4);
  const titleOf = new Map(goals.map((g) => [g.id, g]));

  return (
    <Slip className="p-4 sm:p-5">
      <SectionTitle
        icon={CalendarDays}
        title="Your rhythm"
        aside={<span className="text-xs text-muted-foreground">{count(total, "step")} · {count(activeDays, "day")}</span>}
      />
      <div className="overflow-x-auto">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`${total} steps logged over ${weeks} weeks`}>
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const d = addDays(start, i);
            const n = counts.get(d) ?? 0;
            return (
              <span
                key={d}
                title={`${formatDate(d, { day: "numeric", month: "short" })}: ${n} ${n === 1 ? "step" : "steps"}`}
                className={cn("size-3 rounded-[3px]", d > today ? "bg-transparent" : tone[level(n)], d === today && "ring-1 ring-primary")}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[0.65rem] text-muted-foreground">
        less
        {tone.map((t) => (
          <span key={t} className={cn("size-2.5 rounded-[2px]", t)} />
        ))}
        more
      </div>

      {recent.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-dashed pt-3">
          {recent.map((l) => {
            const g = titleOf.get(l.goal_id);
            return (
              <li key={l.id} className="flex items-baseline gap-2 text-xs">
                <span className={cn("font-semibold tabular-nums", l.amount > 0 ? "text-primary" : "text-muted-foreground")}>
                  {l.amount > 0 ? "+" : ""}
                  {amount(l.amount, g?.unit ?? null)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {g?.title ?? "A goal"}
                  {l.note && <span className="text-muted-foreground"> · {l.note}</span>}
                </span>
                <span className="shrink-0 text-muted-foreground">{relativeDay(l.log_date, today)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Slip>
  );
}
