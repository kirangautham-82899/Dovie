"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarCheck, CalendarClock, ChevronLeft, ChevronRight, Clock, Hourglass, ReceiptText, Smile, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";
import { ErrorNote, PageHeader, SectionTitle } from "@/components/page-header";
import { Slip, Sticky, StickyValue } from "@/components/notebook";
import { setCompleted } from "@/features/tasks/api";
import { moodLabel } from "@/features/checkin/mood";
import { activity } from "@/features/fitness/tracker/activities";
import { formatPaise } from "@/lib/money";
import { addDays, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { addBlock, addTaskOn, calendarKey, deleteBlock, fetchMonth, monthGrid, moveTask } from "./api";
import { type Day, EMPTY, LAYERS, MOOD_DOT, WEEKDAYS, byDay, minutesOf, shiftMonth, timeLabel, useLayers } from "./calendar-model";
import { BlockForm, DayPanel } from "./day-panel";

/** Header copy, shared with the loading skeleton so the page doesn't jump. */
export const CALENDAR_HEADER = {
  eyebrow: "calendar",
  title: "Your month,",
  accent: "at a glance.",
};

export function MonthCalendar({ today }: { today: string }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [blockFor, setBlockFor] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const layers = useLayers();
  const gridRef = useRef<HTMLDivElement>(null);

  const grid = useMemo(() => monthGrid(month), [month]);
  const query = useQuery({ queryKey: calendarKey(month), queryFn: () => fetchMonth(month), placeholderData: (prev) => prev });
  const days = useMemo(() => (query.data ? byDay(query.data, grid.from, grid.to) : new Map<string, Day>()), [query.data, grid]);

  // Warm the neighbouring months so paging feels instant.
  useEffect(() => {
    for (const n of [-1, 1]) {
      const m = shiftMonth(month, n);
      void qc.prefetchQuery({ queryKey: calendarKey(m), queryFn: () => fetchMonth(m) });
    }
  }, [month, qc]);

  const opts = {
    onError: (e: Error) => setError(e.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["planner"] });
    },
  };
  const addTask = useMutation({ mutationFn: (v: { title: string; date: string }) => addTaskOn(v.title, v.date), ...opts });
  const move = useMutation({ mutationFn: (v: { id: string; date: string }) => moveTask(v.id, v.date), ...opts });
  const toggle = useMutation({ mutationFn: (v: { id: string; done: boolean }) => setCompleted(v.id, v.done), ...opts });
  const block = useMutation({ mutationFn: addBlock, ...opts });
  const removeBlock = useMutation({ mutationFn: deleteBlock, ...opts });

  const select = (d: string) => {
    setSelected(d);
    if (d.slice(0, 7) !== month) setMonth(d.slice(0, 7));
  };
  const goMonth = (n: number) => {
    const m = shiftMonth(month, n);
    setMonth(m);
    setSelected(today.slice(0, 7) === m ? today : `${m}-01`);
  };
  const goToday = () => {
    setMonth(today.slice(0, 7));
    setSelected(today);
  };

  // Arrow keys walk the days; Page Up / Page Down turn the month.
  const onGridKey = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      select(addDays(selected, step));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      goMonth(e.key === "PageUp" ? -1 : 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      goToday();
    }
  };
  useEffect(() => {
    if (gridRef.current?.contains(document.activeElement)) {
      gridRef.current.querySelector<HTMLElement>(`[data-day="${selected}"]`)?.focus();
    }
  }, [selected]);

  const monthLabel = formatDate(`${month}-01`, { month: "long", year: "numeric" });
  const isThisMonth = month === today.slice(0, 7);

  const header = (
    <PageHeader
      compact
      {...CALENDAR_HEADER}
      eyebrow={`calendar · ${monthLabel}`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Change month" className="flex items-center rounded-full border bg-card/80 p-0.5 shadow-soft">
            <Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => goMonth(-1)}>
              <ChevronLeft />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-3" disabled={isThisMonth && selected === today} onClick={goToday}>
              Today
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Next month" onClick={() => goMonth(1)}>
              <ChevronRight />
            </Button>
          </div>
          <Button variant="solid" onClick={() => setBlockFor(selected)}>
            <Clock /> Time block
          </Button>
        </div>
      }
    />
  );

  if (query.isPending)
    return (
      <>
        {header}
        <p className="text-sm text-muted-foreground">Opening your month…</p>
      </>
    );
  if (query.isError)
    return (
      <>
        {header}
        <ErrorNote message={`Could not load your calendar: ${query.error.message}`} onRetry={() => query.refetch()} />
      </>
    );

  // Month totals for the sticky notes, counting only days inside this month.
  const inMonth = [...days].filter(([d]) => d.startsWith(month)).map(([, v]) => v);
  const monthTasks = inMonth.flatMap((d) => d.tasks);
  const doneTasks = monthTasks.filter((t) => t.completed_at).length;
  const blockedMin = inMonth.flatMap((d) => d.blocks).reduce((s, b) => s + minutesOf(b), 0);
  const monthBills = inMonth.flatMap((d) => d.bills);
  const billTotal = monthBills.reduce((s, b) => s + (b.amount_paise ?? 0), 0);
  const moods = inMonth.map((d) => d.mood).filter((m): m is number => !!m);
  const goodDays = moods.filter((m) => m >= 4).length;
  const maxSpend = Math.max(1, ...inMonth.map((d) => d.spend ?? 0));

  const day = days.get(selected) ?? EMPTY;
  const upcoming = Array.from({ length: 14 }, (_, i) => addDays(today, i))
    .filter((d) => d <= grid.to)
    .map((d) => ({ d, v: days.get(d) ?? EMPTY }))
    .filter(({ v }) => v.blocks.length || v.bills.length || v.tasks.some((t) => !t.completed_at));

  const drop = (d: string) => {
    if (dragging) {
      const t = query.data.tasks.find((x) => x.id === dragging);
      if (t && t.due_date !== d) move.mutate({ id: t.id, date: d });
    }
    setDragging(null);
    setDropOn(null);
  };

  return (
    <>
      {header}

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 md:grid-cols-4">
        <Sticky
          label="Planned"
          icon={CalendarCheck}
          caption={monthTasks.length ? `${doneTasks} done so far` : "nothing pinned yet"}
          tilt="-rotate-1 [--tape-tilt:-4deg]"
          tone="bg-blush text-foreground"
        >
          <StickyValue value={monthTasks.length} unit="plans" className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Made room"
          icon={Hourglass}
          caption={blockedMin ? "of time set aside" : "add a time block"}
          tilt="rotate-1 [--tape-tilt:3deg]"
          tone="bg-lilac text-lilac-foreground"
        >
          <StickyValue
            value={blockedMin >= 60 ? Math.round((blockedMin / 60) * 10) / 10 : blockedMin}
            unit={blockedMin >= 60 ? "hrs" : "min"}
            className="text-3xl sm:text-4xl"
          />
        </Sticky>
        <Sticky
          label="Bills due"
          icon={ReceiptText}
          caption={billTotal ? `about ${formatPaise(Math.round(billTotal / 100) * 100)}` : monthBills.length ? "amounts not set" : "none this month"}
          tilt="-rotate-[0.5deg] [--tape-tilt:-2deg]"
          tone="bg-butter text-butter-foreground"
        >
          <StickyValue value={monthBills.length} className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Good days"
          icon={Smile}
          caption={moods.length ? `of ${moods.length} check-ins` : "check in to see"}
          tilt="rotate-[1.5deg] [--tape-tilt:4deg]"
          tone="bg-mint text-mint-foreground"
        >
          <StickyValue value={moods.length ? goodDays : "–"} className="text-3xl sm:text-4xl" />
        </Sticky>
      </div>

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Slip className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4">
            <h2 className="font-serif text-xl tracking-tight">{monthLabel}</h2>
            <div role="group" aria-label="Show on the calendar" className="flex flex-wrap gap-1.5">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={layers.on(l.id)}
                  onClick={() => layers.toggle(l.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    layers.on(l.id) ? "bg-card text-foreground shadow-soft" : "border-transparent bg-muted/60 text-muted-foreground line-through decoration-1",
                  )}
                >
                  <span aria-hidden className={cn("size-2 rounded-full", l.dot, !layers.on(l.id) && "opacity-40")} />
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-[0.65rem] font-bold tracking-widest text-muted-foreground uppercase">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1.5">
                <span className="sm:hidden">{w[0]}</span>
                <span className="hidden sm:inline">{w}</span>
              </div>
            ))}
          </div>

          <div
            ref={gridRef}
            role="grid"
            aria-label={`${monthLabel}. Arrow keys move between days, Page Up and Page Down change month.`}
            onKeyDown={onGridKey}
            className={cn("grid grid-cols-7 gap-px bg-border transition-opacity", query.isPlaceholderData && "opacity-60")}
          >
            {grid.days.map((d) => {
              const v = days.get(d) ?? EMPTY;
              const out = !d.startsWith(month);
              const isToday = d === today;
              const isSel = d === selected;
              const heat = layers.on("spend") && v.spend ? 8 + Math.round((v.spend / maxSpend) * 34) : 0;
              const items = [
                ...(layers.on("time") ? v.blocks.map((b) => ({ key: b.id, kind: "time" as const, label: `${timeLabel(b.starts_at)} ${b.title}` })) : []),
                ...(layers.on("bills") ? v.bills.map((b) => ({ key: `bill-${b.id}`, kind: "bill" as const, label: b.title })) : []),
                ...(layers.on("plans")
                  ? v.tasks.map((t) => ({ key: t.id, kind: "task" as const, label: t.title, task: t }))
                  : []),
              ];
              const shown = items.slice(0, 3);
              const count = items.length;
              return (
                <div
                  key={d}
                  role="gridcell"
                  aria-selected={isSel}
                  onDragOver={(e) => {
                    if (!dragging) return;
                    e.preventDefault();
                    setDropOn(d);
                  }}
                  onDragLeave={() => setDropOn((cur) => (cur === d ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    drop(d);
                  }}
                  style={heat ? { backgroundColor: `color-mix(in oklab, var(--secondary) ${heat}%, var(--card))` } : undefined}
                  className={cn(
                    "relative min-w-0 bg-card",
                    out && "bg-muted/15",
                    dropOn === d && "ring-2 ring-primary ring-inset",
                  )}
                >
                  <button
                    type="button"
                    data-day={d}
                    tabIndex={isSel ? 0 : -1}
                    aria-label={`${formatDate(d, { weekday: "long", day: "numeric", month: "long" })}${count ? `, ${count} planned` : ""}${v.mood && layers.on("mood") ? `, felt ${moodLabel(v.mood).toLowerCase()}` : ""}`}
                    onClick={() => select(d)}
                    onDoubleClick={() => setBlockFor(d)}
                    className={cn(
                      "flex h-16 w-full flex-col items-stretch gap-1 p-1 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset sm:h-28 sm:p-1.5",
                      isSel && "bg-primary/[0.07]",
                    )}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                          out && "text-muted-foreground/60",
                          isToday && "bg-primary text-primary-foreground",
                          isSel && !isToday && "ring-1 ring-primary",
                        )}
                      >
                        {Number(d.slice(8))}
                      </span>
                      {layers.on("mood") && v.mood && (
                        <span aria-hidden title={moodLabel(v.mood)} className={cn("size-2 rounded-full", MOOD_DOT[v.mood])} />
                      )}
                    </span>

                    {/* Phones: a row of dots. Wider screens: the first few items by name. */}
                    <span className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                      {items.slice(0, 4).map((it) => (
                        <span
                          key={it.key}
                          className={cn(
                            "size-1.5 rounded-full",
                            it.kind === "time" ? "bg-lilac-foreground/70" : it.kind === "bill" ? "bg-butter-foreground/70" : "bg-primary",
                          )}
                        />
                      ))}
                    </span>
                    <span className="hidden min-w-0 flex-1 flex-col gap-0.5 sm:flex">
                      {shown.map((it) => (
                        <span
                          key={it.key}
                          draggable={it.kind === "task" && !it.task.completed_at}
                          onDragStart={(e) => {
                            if (it.kind !== "task") return;
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", it.task.id);
                            setDragging(it.task.id);
                          }}
                          onDragEnd={() => {
                            setDragging(null);
                            setDropOn(null);
                          }}
                          className={cn(
                            "truncate rounded px-1 py-px text-[0.68rem] leading-tight",
                            it.kind === "time" && "bg-lilac text-lilac-foreground",
                            it.kind === "bill" && "bg-butter text-butter-foreground",
                            it.kind === "task" && "cursor-grab border-l-2 border-primary/70 bg-secondary/50 active:cursor-grabbing",
                            it.kind === "task" && it.task.completed_at && "border-muted-foreground/30 text-muted-foreground line-through",
                          )}
                        >
                          {it.kind === "bill" && "₹ "}
                          {it.label}
                        </span>
                      ))}
                      {count > 3 && <span className="px-1 text-[0.65rem] text-muted-foreground">+{count - 3} more</span>}
                    </span>

                    {layers.on("life") && (v.words || v.moves.length > 0 || v.focus) && (
                      <span className="mt-auto hidden items-center gap-1 text-muted-foreground sm:flex" aria-hidden>
                        {v.words ? <BookOpen className="size-3" /> : null}
                        {v.moves.slice(0, 2).map((m) => {
                          const A = activity(m.activity).icon;
                          return <A key={m.id} className="size-3" />;
                        })}
                        {v.focus ? <Timer className="size-3" /> : null}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="hidden px-4 py-2 text-[0.7rem] text-muted-foreground sm:block">
            Drag a plan onto another day to move it · double-click a day to block time · ← → ↑ ↓ to move, PgUp / PgDn for months
          </p>
        </Slip>

        <DayPanel
          date={selected}
          today={today}
          day={day}
          layers={layers.on}
          onToggle={(t) => toggle.mutate({ id: t.id, done: !t.completed_at })}
          onMove={(t, date) => move.mutate({ id: t.id, date })}
          onRemoveBlock={(id) => removeBlock.mutate(id)}
          onAdd={(title) => addTask.mutate({ title, date: selected })}
          adding={addTask.isPending}
          onBlock={() => setBlockFor(selected)}
        />
      </div>

      {isThisMonth && (
        <Slip className="mt-5 p-4 sm:p-5">
          <SectionTitle
            icon={CalendarClock}
            title="Coming up"
            aside={<span className="text-xs text-muted-foreground">next two weeks</span>}
          />
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Two clear weeks ahead. Lovely.</p>
          ) : (
            <ol className="relative space-y-3 border-l border-dashed border-primary/30 pl-4">
              {upcoming.map(({ d, v }) => (
                <li key={d} className="relative">
                  <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-primary ring-4 ring-card" />
                  <button type="button" onClick={() => select(d)} className="text-left">
                    <span className="font-serif text-base">
                      {d === today ? "Today" : formatDate(d, { weekday: "long", day: "numeric", month: "short" })}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">{d === today ? "" : relativeDay(d, today)}</span>
                  </button>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {v.blocks.map((b) => (
                      <span key={b.id} className="rounded-full bg-lilac px-2 py-0.5 text-xs text-lilac-foreground">
                        {timeLabel(b.starts_at)} · {b.title}
                      </span>
                    ))}
                    {v.bills.map((b) => (
                      <span key={b.id} className="rounded-full bg-butter px-2 py-0.5 text-xs text-butter-foreground">
                        {b.title}
                        {b.amount_paise !== null && ` · ${formatPaise(b.amount_paise)}`}
                      </span>
                    ))}
                    {v.tasks
                      .filter((t) => !t.completed_at)
                      .map((t) => (
                        <span key={t.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {t.is_priority && "★ "}
                          {t.title}
                        </span>
                      ))}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Slip>
      )}

      <Modal open={blockFor !== null} title="Make room for something" onClose={() => setBlockFor(null)}>
        {blockFor && (
          <BlockForm
            initialDay={blockFor}
            pending={block.isPending}
            onSave={(v) => block.mutate(v, { onSuccess: () => setBlockFor(null) })}
          />
        )}
      </Modal>
    </>
  );
}
