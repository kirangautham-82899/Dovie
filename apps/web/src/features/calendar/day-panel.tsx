"use client";

import { useState } from "react";
import { BookOpen, Check, ChevronRight, Clock, Plus, ReceiptText, Star, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Slip } from "@/components/notebook";
import { moodLabel } from "@/features/checkin/mood";
import { activity } from "@/features/fitness/tracker/activities";
import { formatPaise } from "@/lib/money";
import { addDays, daysBetween, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { type CalendarTask } from "./api";
import { type Day, type Layer, MOOD_DOT, timeLabel } from "./calendar-model";

/** The chosen day, in full: time, bills, plans, and how the day went. */
export function DayPanel({
  date,
  today,
  day,
  layers,
  onToggle,
  onMove,
  onRemoveBlock,
  onAdd,
  adding,
  onBlock,
}: {
  date: string;
  today: string;
  day: Day;
  layers: (id: Layer) => boolean;
  onToggle: (t: CalendarTask) => void;
  onMove: (t: CalendarTask, date: string) => void;
  onRemoveBlock: (id: string) => void;
  onAdd: (title: string) => void;
  adding: boolean;
  onBlock: () => void;
}) {
  const n = daysBetween(today, date);
  const rel = n === 0 ? "Today" : n === 1 ? "Tomorrow" : n === -1 ? "Yesterday" : relativeDay(date, today);
  const nothing = !day.tasks.length && !day.blocks.length && !day.bills.length;
  const lived = day.mood || day.words || day.moves.length || day.focus || day.spend;

  return (
    <Slip className="p-4 sm:p-5 lg:sticky lg:top-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-secondary-foreground uppercase">{rel}</p>
          <h2 className="font-serif text-2xl leading-tight tracking-tight">{formatDate(date, { weekday: "long", day: "numeric", month: "long" })}</h2>
        </div>
        <Button size="icon-sm" variant="secondary" aria-label="Block time on this day" title="Block time" onClick={onBlock}>
          <Clock />
        </Button>
      </div>

      {day.blocks.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {day.blocks.map((b) => (
            <li key={b.id} className="group flex items-center gap-2 rounded-lg bg-lilac px-2.5 py-1.5 text-sm text-lilac-foreground">
              <span className="shrink-0 text-xs tabular-nums">
                {timeLabel(b.starts_at)}–{timeLabel(b.ends_at)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{b.title}</span>
              <button
                type="button"
                aria-label={`Remove ${b.title}`}
                onClick={() => onRemoveBlock(b.id)}
                className="flex size-6 shrink-0 items-center justify-center rounded-full opacity-70 transition hover:bg-card/60 hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {day.bills.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {day.bills.map((b) => (
            <li key={b.id} className="flex items-center gap-2 rounded-lg bg-butter px-2.5 py-1.5 text-sm text-butter-foreground">
              <ReceiptText className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{b.title}</span>
              {b.amount_paise !== null && <span className="text-xs tabular-nums">{formatPaise(b.amount_paise)}</span>}
            </li>
          ))}
        </ul>
      )}

      {day.tasks.length > 0 && (
        <ul className="mb-3 space-y-1">
          {day.tasks.map((t) => {
            const done = t.completed_at !== null;
            return (
              <li key={t.id} className="group flex items-center gap-2 text-sm">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={`Mark "${t.title}" as ${done ? "not done" : "done"}`}
                  onClick={() => onToggle(t)}
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    done ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary",
                  )}
                >
                  {done && <Check className="size-3" />}
                </button>
                <span className={cn("min-w-0 flex-1 truncate", done && "text-muted-foreground line-through")}>
                  {t.is_priority && <Star className="mr-1 inline size-3 fill-primary text-primary" aria-label="Priority" />}
                  {t.title}
                </span>
                {!done && (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-muted-foreground [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Move "${t.title}" to the next day`}
                    title="Push to the next day"
                    onClick={() => onMove(t, addDays(date, 1))}
                  >
                    <ChevronRight />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {nothing && <p className="mb-3 text-sm text-muted-foreground">{date < today ? "Nothing was planned." : "Room to breathe."}</p>}

      {date >= today && <QuickAdd onAdd={onAdd} pending={adding} />}

      {lived && (layers("mood") || layers("life") || layers("spend")) ? (
        <div className="mt-4 border-t border-dashed pt-3">
          <p className="mb-2 font-hand text-lg leading-none text-muted-foreground">how it went</p>
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {layers("mood") && day.mood ? (
              <li className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5">
                <span aria-hidden className={cn("size-2 rounded-full", MOOD_DOT[day.mood])} /> {moodLabel(day.mood)}
              </li>
            ) : null}
            {layers("life") && day.words ? (
              <li className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <BookOpen className="size-3" /> {day.words} words
              </li>
            ) : null}
            {layers("life") &&
              day.moves.map((m) => {
                const a = activity(m.activity);
                return (
                  <li key={m.id} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                    <a.icon className="size-3" /> {a.label} · {Math.max(1, Math.round(m.duration_s / 60))} min
                  </li>
                );
              })}
            {layers("life") && day.focus ? (
              <li className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <Timer className="size-3" /> {day.focus} min focus
              </li>
            ) : null}
            {layers("spend") && day.spend ? (
              <li className="rounded-full bg-muted px-2 py-0.5 tabular-nums">{formatPaise(day.spend)} spent</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </Slip>
  );
}

function QuickAdd({ onAdd, pending }: { onAdd: (title: string) => void; pending: boolean }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title);
        setTitle("");
      }}
    >
      <Input
        aria-label="Add a plan to this day"
        placeholder="Add a plan…"
        maxLength={200}
        className="h-9 text-sm"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Button type="submit" size="icon-lg" variant="secondary" aria-label="Add plan" loading={pending} disabled={!title.trim()}>
        {!pending && <Plus />}
      </Button>
    </form>
  );
}

export function BlockForm({
  initialDay,
  pending,
  onSave,
}: {
  initialDay: string;
  pending: boolean;
  onSave: (v: { title: string; block_date: string; starts_at: string; ends_at: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(initialDay);
  const [start, setStart] = useState("13:00");
  const [end, setEnd] = useState("14:00");
  const valid = title.trim() && day && start && end && end > start;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ title, block_date: day, starts_at: start, ends_at: end });
      }}
    >
      <Field label="What's this time for?">
        <Input placeholder="A proper lunch break" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Day">
        <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Ends">
          <Input type="time" value={end} aria-invalid={!!start && !!end && end <= start} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!valid}>
        Save time block
      </Button>
    </form>
  );
}
