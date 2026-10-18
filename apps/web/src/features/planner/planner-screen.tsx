"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Eye, EyeOff, ListChecks, Pencil, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorNote } from "@/components/page-header";
import { addDays, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MAX_PRIORITIES, MAX_TITLE_LENGTH, type Task } from "@/features/tasks/types";
import { monthGrid } from "./api";
import { usePlanner } from "./use-planner";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** A small donut showing how much of a day is checked off. */
function DayRing({ done, total, size = 96 }: { done: number; total: number; size?: number }) {
  const stroke = size / 9;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pct === 1 ? "var(--chart-5)" : "var(--primary)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-2xl leading-none tabular-nums">{total ? Math.round(pct * 100) : 0}%</span>
        <span className="text-[0.6rem] text-muted-foreground">
          {done}/{total}
        </span>
      </div>
    </div>
  );
}

export function PlannerScreen({ today }: { today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const p = usePlanner(month, today, setError);
  const tasks = p.query.data ?? [];
  const grid = monthGrid(month);

  const byDay = new Map<string, Task[]>();
  for (const t of tasks) byDay.set(t.due_date, [...(byDay.get(t.due_date) ?? []), t]);

  const inMonth = tasks.filter((t) => t.due_date.startsWith(month));
  const doneInMonth = inMonth.filter((t) => t.completed_at).length;
  const perfectDays = [...byDay.entries()].filter(
    ([d, list]) => d.startsWith(month) && list.length > 0 && list.every((t) => t.completed_at),
  ).length;

  function pick(day: string) {
    setSelected(day);
    if (!day.startsWith(month)) setMonth(day.slice(0, 7));
  }

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}
      {p.query.isError && <ErrorNote message={`Could not load your plans: ${p.query.error.message}`} onRetry={() => p.query.refetch()} />}

      <div className="ruled lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-2xl tracking-tight">{formatDate(`${month}-01`, { month: "long", year: "numeric" })}</h2>
            <div className="flex items-center gap-1">
              <Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
                <ChevronLeft />
              </Button>
              <Button
                size="xs"
                variant="secondary"
                onClick={() => {
                  setMonth(today.slice(0, 7));
                  setSelected(today);
                }}
              >
                Today
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Month">
            {WEEKDAYS.map((d) => (
              <span key={d} className="pb-1 text-[0.62rem] font-bold tracking-wider text-muted-foreground uppercase">
                {d}
              </span>
            ))}
            {grid.days.map((d) => {
              const list = byDay.get(d) ?? [];
              const done = list.filter((t) => t.completed_at).length;
              const all = list.length > 0 && done === list.length;
              const isSel = d === selected;
              const isToday = d === today;
              const outside = !d.startsWith(month);
              return (
                <button
                  key={d}
                  type="button"
                  role="gridcell"
                  aria-selected={isSel}
                  aria-label={`${formatDate(d, { weekday: "long", day: "numeric", month: "long" })}, ${list.length} plans, ${done} done`}
                  onClick={() => pick(d)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl text-sm transition-all sm:aspect-[1/0.9]",
                    isSel ? "bg-primary font-semibold text-primary-foreground shadow-soft" : "hover:bg-secondary",
                    outside && !isSel && "text-muted-foreground/45",
                    isToday && !isSel && "ring-2 ring-primary/60 ring-inset",
                  )}
                >
                  <span className="tabular-nums">{Number(d.slice(8))}</span>
                  {list.length > 0 &&
                    (all ? (
                      <span className={cn("flex size-4 items-center justify-center rounded-full", isSel ? "bg-primary-foreground/20" : "bg-chart-5 text-white")}>
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="flex gap-0.5">
                        {list.slice(0, 4).map((t) => (
                          <span
                            key={t.id}
                            className={cn(
                              "size-1.5 rounded-full",
                              t.completed_at ? (isSel ? "bg-primary-foreground" : "bg-chart-5") : isSel ? "bg-primary-foreground/40" : "bg-primary/45",
                            )}
                          />
                        ))}
                      </span>
                    ))}
                </button>
              );
            })}
          </div>

          <dl className="grid grid-cols-3 divide-x border-t pt-3 text-center">
            <div>
              <dt className="text-[0.6rem] font-bold tracking-wider text-muted-foreground uppercase">Planned</dt>
              <dd className="font-serif text-2xl tabular-nums">{inMonth.length}</dd>
            </div>
            <div>
              <dt className="text-[0.6rem] font-bold tracking-wider text-muted-foreground uppercase">Done</dt>
              <dd className="font-serif text-2xl tabular-nums">{doneInMonth}</dd>
            </div>
            <div>
              <dt className="text-[0.6rem] font-bold tracking-wider text-muted-foreground uppercase">Clear days</dt>
              <dd className="font-serif text-2xl tabular-nums">{perfectDays}</dd>
            </div>
          </dl>
        </Card>

        <DayPanel
          key={selected}
          day={selected}
          today={today}
          tasks={byDay.get(selected) ?? []}
          loading={p.query.isPending}
          actions={p}
          onClearError={() => setError(null)}
          onGoTo={pick}
        />
      </div>
    </div>
  );
}

type Actions = ReturnType<typeof usePlanner>;

function DayPanel({
  day,
  today,
  tasks,
  loading,
  actions,
  onClearError,
  onGoTo,
}: {
  day: string;
  today: string;
  tasks: Task[];
  loading: boolean;
  actions: Actions;
  onClearError: () => void;
  onGoTo: (day: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const done = tasks.filter((t) => t.completed_at).length;
  const open = tasks.filter((t) => !t.completed_at);
  const priorities = tasks.filter((t) => t.is_priority).length;
  const sorted = [...tasks].sort(
    (a, b) => Number(!!a.completed_at) - Number(!!b.completed_at) || Number(b.is_priority) - Number(a.is_priority),
  );
  const shown = hideDone ? sorted.filter((t) => !t.completed_at) : sorted;
  const rel = relativeDay(day, today);
  const isPast = day < today;
  const tomorrow = addDays(day, 1);

  return (
    <Card className="min-h-[28rem]">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{rel === "today" || rel === "tomorrow" || rel === "yesterday" ? rel : formatDate(day, { weekday: "long" })}</p>
          <h2 className="font-serif text-3xl leading-tight tracking-tight">{formatDate(day, { weekday: "short", day: "numeric", month: "long" })}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length === 0
              ? isPast
                ? "Nothing was planned here."
                : "A clear page. Add what matters."
              : done === tasks.length
                ? "Everything checked off. Well done."
                : `${open.length} to go${priorities ? ` · ${priorities} priorit${priorities > 1 ? "ies" : "y"}` : ""}`}
          </p>
        </div>
        <DayRing done={done} total={tasks.length} />
      </div>

      {tasks.length > 0 && done === tasks.length && (
        <div className="animate-rise flex items-center gap-2 rounded-2xl bg-mint px-3.5 py-2.5 text-sm text-mint-foreground">
          <Sparkles className="size-4" /> Day complete. Take a breath and enjoy it.
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onClearError();
          actions.add.mutate({ title, date: day, priority: priority && priorities < MAX_PRIORITIES });
          setTitle("");
          setPriority(false);
        }}
      >
        <div className="relative flex-1">
          <Input
            aria-label={`Add a task for ${formatDate(day, { day: "numeric", month: "long" })}`}
            placeholder={isPast ? "Add something you did…" : "Add a task…"}
            maxLength={MAX_TITLE_LENGTH}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 pr-11"
          />
          <button
            type="button"
            aria-pressed={priority}
            aria-label="Make it a priority"
            title={priorities >= MAX_PRIORITIES ? "This day already has 3 priorities" : "Priority"}
            disabled={priorities >= MAX_PRIORITIES}
            onClick={() => setPriority((v) => !v)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:text-primary disabled:opacity-30"
          >
            <Star className={cn("size-4", priority && "fill-primary text-primary")} />
          </button>
        </div>
        <Button type="submit" size="icon-lg" className="size-11" aria-label="Add task" disabled={!title.trim()}>
          <Plus />
        </Button>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((t) => (
            <PlanRow
              key={t.id}
              task={t}
              tomorrow={tomorrow}
              priorityLocked={!t.is_priority && priorities >= MAX_PRIORITIES}
              actions={actions}
              onClearError={onClearError}
            />
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
        {done > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setHideDone((v) => !v)}>
            {hideDone ? <Eye /> : <EyeOff />} {hideDone ? `Show ${done} done` : "Hide done"}
          </Button>
        )}
        {open.length > 0 && !isPast && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onClearError();
              actions.move.mutate({ ids: open.map((t) => t.id), date: tomorrow });
              onGoTo(tomorrow);
            }}
          >
            <ArrowRight /> Move {open.length} unfinished to {formatDate(tomorrow, { weekday: "short" })}
          </Button>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <ListChecks className="size-3.5" /> Unfinished past plans roll into today on their own.
        </span>
      </div>
    </Card>
  );
}

function PlanRow({
  task,
  tomorrow,
  priorityLocked,
  actions,
  onClearError,
}: {
  task: Task;
  tomorrow: string;
  priorityLocked: boolean;
  actions: Actions;
  onClearError: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const done = task.completed_at !== null;
  const temp = task.id.startsWith("temp-");

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all",
        done ? "border-transparent bg-muted/50" : "bg-background hover:border-primary/40 hover:shadow-soft",
        task.is_priority && !done && "border-primary/40 bg-secondary/40",
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        disabled={temp}
        onClick={() => {
          onClearError();
          actions.toggle.mutate({ id: task.id, done: !done });
        }}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          done ? "scale-105 border-chart-5 bg-chart-5 text-white" : "border-border hover:border-primary hover:bg-secondary",
        )}
      >
        {done && <Check className="size-3.5 animate-[pop_0.35s_ease-out]" strokeWidth={3} />}
      </button>

      {editing ? (
        <form
          className="flex flex-1 gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const t = draft.trim();
            setEditing(false);
            if (t && t !== task.title) actions.rename.mutate({ id: task.id, title: t });
          }}
        >
          <Input autoFocus value={draft} maxLength={MAX_TITLE_LENGTH} onChange={(e) => setDraft(e.target.value)} onBlur={() => setEditing(false)} className="h-8" />
        </form>
      ) : (
        <span className={cn("min-w-0 flex-1 text-sm break-words", done && "text-muted-foreground line-through decoration-chart-5/60")}>
          {task.title}
          {task.carry_count > 0 && !done && (
            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] text-muted-foreground">carried {task.carry_count}×</span>
          )}
        </span>
      )}

      {!editing && !temp && (
        <span className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label={task.is_priority ? "Remove priority" : "Make it a priority"}
            aria-pressed={task.is_priority}
            disabled={priorityLocked || done}
            onClick={() => {
              onClearError();
              actions.star.mutate({ id: task.id, value: !task.is_priority });
            }}
            className="rounded-full p-1.5 hover:bg-muted disabled:opacity-30"
          >
            <Star className={cn("size-3.5", task.is_priority && "fill-primary text-primary")} />
          </button>
          {!done && (
            <>
              <button
                type="button"
                aria-label="Rename"
                onClick={() => {
                  setDraft(task.title);
                  setEditing(true);
                }}
                className="rounded-full p-1.5 hover:bg-muted"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Move to the next day"
                onClick={() => actions.move.mutate({ ids: [task.id], date: tomorrow })}
                className="rounded-full p-1.5 hover:bg-muted"
              >
                <ArrowRight className="size-3.5" />
              </button>
            </>
          )}
          <button type="button" aria-label="Delete" onClick={() => actions.remove.mutate(task.id)} className="rounded-full p-1.5 hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="size-3.5" />
          </button>
        </span>
      )}
    </li>
  );
}
