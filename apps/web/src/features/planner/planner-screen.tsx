"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/page-header";
import { addDays, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MAX_PRIORITIES, MAX_TITLE_LENGTH, type Task } from "@/features/tasks/types";
import type { TimeBlock } from "@/features/calendar/api";
import { clock, fillsRow, HOURS, hourLabel, rowOf, slotTimes } from "./time";
import { usePlanner } from "./use-planner";

type Actions = ReturnType<typeof usePlanner>;

/** Every row on the page is two grid squares tall and ruled along its top edge. */
const ROW = "flex h-12 items-center gap-3 border-t border-foreground/10";

export function PlannerScreen({ today }: { today: string }) {
  const [day, setDay] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const p = usePlanner(day, today, setError);

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}
      {p.query.isError && <ErrorNote message={`Could not load your plans: ${p.query.error.message}`} onRetry={() => p.query.refetch()} />}
      {p.blocks.isError && <ErrorNote message={`Could not load your timetable: ${p.blocks.error.message}`} onRetry={() => p.blocks.refetch()} />}

      <div className="overflow-hidden border bg-card shadow-sm lg:grid lg:grid-cols-[1.1fr_1fr]">
        <PlanPage
          key={day}
          day={day}
          today={today}
          tasks={p.query.data ?? []}
          loading={p.query.isPending}
          actions={p}
          onClearError={() => setError(null)}
          onGoTo={setDay}
        />
        <Timetable day={day} today={today} entries={p.blocks.data ?? []} loading={p.blocks.isPending} actions={p} onClearError={() => setError(null)} />
      </div>
    </div>
  );
}

/** The left page: the date, the top three and everything else planned for the day. */
function PlanPage({
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
  const [hideDone, setHideDone] = useState(false);
  const done = tasks.filter((t) => t.completed_at).length;
  const open = tasks.filter((t) => !t.completed_at);
  const top = tasks.filter((t) => t.is_priority).slice(0, MAX_PRIORITIES);
  const rest = tasks
    .filter((t) => !t.is_priority)
    .sort((a, b) => Number(!!a.completed_at) - Number(!!b.completed_at))
    .filter((t) => !hideDone || !t.completed_at);
  const rel = relativeDay(day, today);
  const isPast = day < today;
  const tomorrow = addDays(day, 1);

  return (
    <section aria-label="Plan your day" className="grid-paper p-6">
      <header className="flex min-h-24 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Plan your day</p>
          <h2 className="font-serif text-2xl leading-tight tracking-tight"><span className="highlighter px-1 -mx-1">{formatDate(day, { weekday: "short", day: "numeric", month: "long" })}</span></h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {rel === "today" || rel === "tomorrow" || rel === "yesterday" ? `${rel[0].toUpperCase()}${rel.slice(1)}` : rel}
            {tasks.length > 0 && ` · ${done} of ${tasks.length} done`}
          </p>
        </div>
        <nav aria-label="Choose a day" className="flex shrink-0 items-center gap-0.5">
          <Button size="icon-sm" variant="ghost" aria-label="Previous day" onClick={() => onGoTo(addDays(day, -1))}>
            <ChevronLeft />
          </Button>
          <Button size="xs" variant="secondary" disabled={day === today} onClick={() => onGoTo(today)}>
            Today
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Next day" onClick={() => onGoTo(addDays(day, 1))}>
            <ChevronRight />
          </Button>
        </nav>
      </header>

      <div className="flex h-12 items-end justify-between gap-3 pb-2.5">
        <h3 className="font-serif text-lg leading-none tracking-tight"><span className="highlighter -mx-1 px-1">Top 3</span></h3>
        <span className="text-xs leading-none text-muted-foreground">what matters most today</span>
      </div>
      <ul aria-label="Top three">
        {loading
          ? [0, 1, 2].map((i) => <SkeletonRow key={i} />)
          : Array.from({ length: MAX_PRIORITIES }, (_, i) => {
              const task = top[i];
              return task ? (
                <TaskLine key={task.id} task={task} slot={i + 1} tomorrow={tomorrow} priorityLocked={false} actions={actions} onClearError={onClearError} />
              ) : (
                <LineAdd
                  key={`slot-${i}`}
                  label={`Top priority ${i + 1}`}
                  placeholder={i === top.length ? "Write one thing that matters…" : "…and another"}
                  marker={
                    <span className="flex size-6 shrink-0 items-center justify-center border border-dashed border-foreground/35 font-serif text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                  }
                  onAdd={(title) => {
                    onClearError();
                    actions.add.mutate({ title, date: day, priority: true });
                  }}
                />
              );
            })}
      </ul>

      <div className="flex h-12 items-end justify-between gap-3 pb-2.5">
        <h3 className="font-serif text-lg leading-none tracking-tight"><span className="highlighter -mx-1 px-1">To do</span></h3>
        {done > 0 && (
          <button
            type="button"
            onClick={() => setHideDone((v) => !v)}
            className="flex items-center gap-1 text-xs leading-none text-muted-foreground hover:text-foreground"
          >
            {hideDone ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {hideDone ? `Show ${done} done` : "Hide done"}
          </button>
        )}
      </div>
      <ul aria-label="To do">
        {loading
          ? [0, 1].map((i) => <SkeletonRow key={i} />)
          : rest.map((t) => (
              <TaskLine key={t.id} task={t} tomorrow={tomorrow} priorityLocked={top.length >= MAX_PRIORITIES} actions={actions} onClearError={onClearError} />
            ))}
        <LineAdd
          label={`Add a task for ${formatDate(day, { day: "numeric", month: "long" })}`}
          placeholder={isPast ? "Add something you did…" : "Add a task…"}
          marker={
            <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground">
              <Plus className="size-4" />
            </span>
          }
          onAdd={(title) => {
            onClearError();
            actions.add.mutate({ title, date: day, priority: false });
          }}
        />
      </ul>

      <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-foreground/10 pt-3 text-xs text-muted-foreground">
        {open.length > 0 && !isPast && (
          <button
            type="button"
            className="flex items-center gap-1 font-medium text-foreground hover:underline"
            onClick={() => {
              onClearError();
              actions.move.mutate({ ids: open.map((t) => t.id), date: tomorrow });
              onGoTo(tomorrow);
            }}
          >
            <ArrowRight className="size-3.5" /> Move {open.length} unfinished to {formatDate(tomorrow, { weekday: "short" })}
          </button>
        )}
        <span>Unfinished past plans roll into today on their own.</span>
      </footer>
    </section>
  );
}

function SkeletonRow() {
  return (
    <li className={ROW}>
      <span className="size-6 shrink-0 animate-pulse bg-muted" />
      <span className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
    </li>
  );
}

/** A square tick box that is one grid square wide. A slot number sits inside until it is ticked. */
function Box({ checked, slot, disabled, label, onToggle }: { checked: boolean; slot?: number; disabled?: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center border font-serif text-xs leading-none transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-foreground/45 text-muted-foreground hover:border-primary hover:bg-secondary",
      )}
    >
      {checked ? <Check className="size-4 animate-[pop_0.35s_ease-out]" strokeWidth={3} /> : slot}
    </button>
  );
}

/**
 * A bare writing line. Enter or leaving the line files whatever was typed;
 * an empty line does nothing.
 */
function LineAdd({ label, placeholder, marker, onAdd }: { label: string; placeholder: string; marker: React.ReactNode; onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");

  function commit() {
    const title = value.trim();
    if (!title) return;
    onAdd(title);
    setValue("");
  }

  return (
    <li className={cn(ROW, "focus-within:bg-secondary/40")}>
      {marker}
      <input
        aria-label={label}
        placeholder={placeholder}
        maxLength={MAX_TITLE_LENGTH}
        enterKeyHint="done"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </li>
  );
}

function TaskLine({
  task,
  slot,
  tomorrow,
  priorityLocked,
  actions,
  onClearError,
}: {
  task: Task;
  /** 1-3 for a line in the top three. */
  slot?: number;
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
    <li className={cn(ROW, "group")}>
      <Box
        checked={done}
        slot={slot}
        disabled={temp}
        label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        onToggle={() => {
          onClearError();
          actions.toggle.mutate({ id: task.id, done: !done });
        }}
      />

      {editing ? (
        <form
          className="flex h-full min-w-0 flex-1 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            const t = draft.trim();
            setEditing(false);
            if (t && t !== task.title) actions.rename.mutate({ id: task.id, title: t });
          }}
        >
          <input
            autoFocus
            aria-label="Rename"
            value={draft}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            className="h-8 w-full border-b border-foreground/40 bg-transparent text-sm outline-none"
          />
        </form>
      ) : (
        <span className={cn("line-clamp-2 min-w-0 flex-1 text-sm leading-tight break-words", done && "text-muted-foreground line-through")} title={task.title}>
          {task.title}
          {task.carry_count > 0 && !done && <span className="ml-2 text-[0.65rem] text-muted-foreground">carried {task.carry_count}×</span>}
        </span>
      )}

      {!editing && !temp && (
        <span className="flex shrink-0 items-center opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            aria-label={task.is_priority ? "Take out of the top three" : "Add to the top three"}
            aria-pressed={task.is_priority}
            disabled={priorityLocked || done}
            onClick={() => {
              onClearError();
              actions.star.mutate({ id: task.id, value: !task.is_priority });
            }}
            className="p-1.5 hover:bg-muted disabled:opacity-30"
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
                className="p-1.5 hover:bg-muted"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Move to the next day"
                onClick={() => actions.move.mutate({ ids: [task.id], date: tomorrow })}
                className="p-1.5 hover:bg-muted"
              >
                <ArrowRight className="size-3.5" />
              </button>
            </>
          )}
          <button type="button" aria-label="Delete" onClick={() => actions.remove.mutate(task.id)} className="p-1.5 hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="size-3.5" />
          </button>
        </span>
      )}
    </li>
  );
}

/** The right page: one ruled row per hour to write the day into. */
function Timetable({
  day,
  today,
  entries,
  loading,
  actions,
  onClearError,
}: {
  day: string;
  today: string;
  entries: TimeBlock[];
  loading: boolean;
  actions: Actions;
  onClearError: () => void;
}) {
  const [nowHour, setNowHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setNowHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section aria-label="Timetable" className="grid-paper border-t p-6 lg:border-t-0 lg:border-l">
      <header className="min-h-24">
        <p className="eyebrow">Timetable</p>
        <h2 className="font-serif text-2xl leading-tight tracking-tight"><span className="highlighter -mx-1 px-1">Hour by hour</span></h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Write on the line next to a time to give it a job.</p>
      </header>

      <ol aria-busy={loading} className="mt-6 border-b border-foreground/10">
        {HOURS.map((hour) => {
          const rowEntries = entries.filter((b) => rowOf(b) === hour);
          const isNow = day === today && hour === nowHour;
          return (
            <li key={hour} className={cn("flex border-t border-foreground/10 focus-within:bg-secondary/40", isNow && "bg-primary/10")}>
              <span
                className={cn(
                  "flex h-[calc(3rem-1px)] w-16 shrink-0 items-center justify-end border-r border-foreground/10 pr-3 text-xs tabular-nums text-muted-foreground",
                  isNow && "font-semibold text-foreground",
                )}
              >
                {hourLabel(hour)}
              </span>
              <div className="flex min-h-[calc(3rem-1px)] min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5">
                {rowEntries.map((b) => (
                  <Entry key={b.id} block={b} onRemove={() => actions.removeEntry.mutate(b.id)} />
                ))}
                <HourInput
                  label={`Plan for ${hourLabel(hour)}`}
                  placeholder={`Add at ${hourLabel(hour)}`}
                  onAdd={(title) => {
                    onClearError();
                    actions.addEntry.mutate({ title, ...slotTimes(hour) });
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Entry({ block, onRemove }: { block: TimeBlock; onRemove: () => void }) {
  const temp = block.id.startsWith("temp-");
  return (
    <span className="group/entry inline-flex min-h-7 max-w-full items-center gap-1.5 border-l-2 border-primary bg-primary/15 pl-2 text-sm">
      <span className="min-w-0 truncate" title={block.title}>
        {block.title}
      </span>
      {!fillsRow(block) && (
        <span className="shrink-0 text-[0.65rem] text-muted-foreground">
          {clock(block.starts_at)}–{clock(block.ends_at)}
        </span>
      )}
      <button
        type="button"
        aria-label={`Remove ${block.title}`}
        disabled={temp}
        onClick={onRemove}
        className="p-1.5 text-muted-foreground opacity-60 hover:text-destructive group-hover/entry:opacity-100 focus-visible:opacity-100 disabled:opacity-30"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

/** The writing space on an hour's line. The hint only shows once the line is hovered or focused. */
function HourInput({ label, placeholder, onAdd }: { label: string; placeholder: string; onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");

  function commit() {
    const title = value.trim();
    if (!title) return;
    onAdd(title);
    setValue("");
  }

  return (
    <input
      aria-label={label}
      placeholder={placeholder}
      maxLength={80}
      enterKeyHint="done"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className="h-9 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-transparent hover:placeholder:text-muted-foreground/60 focus:placeholder:text-muted-foreground/60"
    />
  );
}
