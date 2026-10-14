"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { Field, selectClass } from "@/components/field";
import { ErrorNote } from "@/components/page-header";
import { setCompleted } from "@/features/tasks/api";
import { addDays, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { addBlock, addTaskOn, deleteBlock, fetchWeekPlan, moveTask } from "./api";

function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

export function WeekPlanner({ today }: { today: string }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [blockFor, setBlockFor] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const query = useQuery({ queryKey: ["calendar", today], queryFn: () => fetchWeekPlan(today) });

  const opts = {
    onError: (e: Error) => setError(e.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  };
  const addTask = useMutation({ mutationFn: (v: { title: string; date: string }) => addTaskOn(v.title, v.date), ...opts });
  const move = useMutation({ mutationFn: (v: { id: string; date: string }) => moveTask(v.id, v.date), ...opts });
  const toggle = useMutation({ mutationFn: (v: { id: string; done: boolean }) => setCompleted(v.id, v.done), ...opts });
  const block = useMutation({ mutationFn: addBlock, ...opts });
  const removeBlock = useMutation({ mutationFn: deleteBlock, ...opts });

  if (query.isPending) return <p className="text-sm text-muted-foreground">Getting your plans…</p>;
  if (query.isError) return <ErrorNote message={query.error.message} onRetry={() => query.refetch()} />;

  const { tasks, blocks } = query.data;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}

      <div className="ruled grid-cols-7" aria-label="A week at a glance">
        {days.map((d) => {
          const count = tasks.filter((t) => t.due_date === d).length + blocks.filter((b) => b.block_date === d).length;
          return (
            <a
              key={d}
              href={`#day-${d}`}
              className={cn(
                "relative px-1 py-2.5 text-center transition-colors hover:bg-secondary/50",
                d === today && "bg-secondary/60 text-primary",
              )}
            >
              <p className="text-[0.65rem] font-bold tracking-widest text-muted-foreground uppercase">
                {formatDate(d, { weekday: "short" })}
              </p>
              <p className="font-serif text-xl">{formatDate(d, { day: "numeric" })}</p>
              <p className="text-[0.65rem] text-muted-foreground">{count ? `${count} planned` : "open"}</p>
            </a>
          );
        })}
      </div>

      <div className="ruled md:grid-cols-2">
        {days.map((d) => {
          const dayBlocks = blocks.filter((b) => b.block_date === d);
          const dayTasks = tasks.filter((t) => t.due_date === d);
          return (
            <Card key={d} id={`day-${d}`} className="scroll-mt-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-lg">
                  {d === today ? "Today" : d === addDays(today, 1) ? "Tomorrow" : formatDate(d, { weekday: "long" })}
                  <span className="ml-2 font-sans text-xs text-muted-foreground">
                    {formatDate(d, { day: "numeric", month: "short" })}
                  </span>
                </h2>
                <Button size="xs" variant="ghost" onClick={() => setBlockFor(d)}>
                  <Clock /> Time block
                </Button>
              </div>

              {dayBlocks.length > 0 && (
                <ul className="space-y-1.5">
                  {dayBlocks.map((b) => (
                    <li key={b.id} className="group flex items-center gap-2 border-l-2 border-chart-4 py-1 pl-3 text-sm">
                      <span className="w-32 shrink-0 text-xs">
                        {timeLabel(b.starts_at)} – {timeLabel(b.ends_at)}
                      </span>
                      <span className="flex-1 truncate">{b.title}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${b.title}`}
                        onClick={() => removeBlock.mutate(b.id)}
                        className="rounded p-1 opacity-60 group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <ul className="space-y-1">
                {dayTasks.map((t) => {
                  const done = t.completed_at !== null;
                  return (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={done}
                        aria-label={`Mark "${t.title}" as ${done ? "not done" : "done"}`}
                        onClick={() => toggle.mutate({ id: t.id, done: !done })}
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border",
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
                        <select
                          aria-label={`Move "${t.title}" to another day`}
                          className="h-7 rounded-lg border bg-background px-1 text-xs text-muted-foreground"
                          value={d}
                          onChange={(e) => move.mutate({ id: t.id, date: e.target.value })}
                        >
                          {days.map((o) => (
                            <option key={o} value={o}>
                              {o === today ? "Today" : formatDate(o, { weekday: "short", day: "numeric" })}
                            </option>
                          ))}
                        </select>
                      )}
                    </li>
                  );
                })}
              </ul>
              {dayTasks.length === 0 && dayBlocks.length === 0 && (
                <p className="text-xs text-muted-foreground">Room to breathe.</p>
              )}
              <QuickAdd onAdd={(title) => addTask.mutate({ title, date: d })} />
            </Card>
          );
        })}
        {/* Seven days plus this note fill the two-column grid evenly. */}
        <Card className="justify-center bg-blush">
          <p className="font-serif text-2xl tracking-tight">
            Plans are allowed to <em className="text-rose">change.</em>
          </p>
          <p className="text-sm text-muted-foreground">
            Use the small menu on a task to move it to another day. Moving it isn&apos;t falling behind.
          </p>
        </Card>
      </div>

      <Modal open={blockFor !== null} title="Make room for something" onClose={() => setBlockFor(null)}>
        {blockFor && (
          <BlockForm
            days={days}
            today={today}
            initialDay={blockFor}
            onSave={(v) => block.mutate(v, { onSuccess: () => setBlockFor(null) })}
          />
        )}
      </Modal>
    </div>
  );
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
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
        aria-label="Add a plan"
        placeholder="Add a small plan…"
        maxLength={200}
        className="h-8 text-sm"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Button type="submit" size="icon" variant="secondary" aria-label="Add plan" disabled={!title.trim()}>
        <Plus />
      </Button>
    </form>
  );
}

function BlockForm({
  days,
  today,
  initialDay,
  onSave,
}: {
  days: string[];
  today: string;
  initialDay: string;
  onSave: (v: { title: string; block_date: string; starts_at: string; ends_at: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(initialDay);
  const [start, setStart] = useState("13:00");
  const [end, setEnd] = useState("14:00");
  const valid = title.trim() && start && end && end > start;
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
        <select className={selectClass} value={day} onChange={(e) => setDay(e.target.value)}>
          {days.map((d) => (
            <option key={d} value={d}>
              {d === today ? "Today" : formatDate(d, { weekday: "long", day: "numeric", month: "short" })}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Ends">
          <Input type="time" value={end} aria-invalid={!!start && !!end && end <= start} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={!valid}>
        Save time block
      </Button>
    </form>
  );
}
