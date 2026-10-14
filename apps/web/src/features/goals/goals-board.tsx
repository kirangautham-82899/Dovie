"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Footprints, Plus, Sprout, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { ChoicePills, Field } from "@/components/field";
import { EmptyState, ErrorNote, SectionTitle } from "@/components/page-header";
import { logMovement } from "@/features/wellness/api";
import { formatAmount } from "@/features/fitness/format";
import { daysBetween, formatDate, relativeDay } from "@/lib/dates";
import { AREAS, type Area, addGoal, addGoalProgress, deleteGoal, deleteMovement, fetchGoals, fetchMovement } from "./api";

const AREA_TONE: Record<Area, string> = {
  health: "bg-secondary text-secondary-foreground",
  money: "bg-butter text-butter-foreground",
  balance: "bg-sky text-sky-foreground",
  growth: "bg-lilac text-lilac-foreground",
};

export function GoalsBoard() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const goals = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });

  const opts = {
    onError: (e: Error) => setError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  };
  const add = useMutation({ mutationFn: addGoal, ...opts });
  const progress = useMutation({ mutationFn: (v: { id: string; amount: number }) => addGoalProgress(v.id, v.amount), ...opts });
  const remove = useMutation({ mutationFn: deleteGoal, ...opts });

  return (
    <Card>
      <SectionTitle
        icon={Sprout}
        title="Your goals"
        aside={
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus /> Add a goal
          </Button>
        }
      />
      {error && <ErrorNote message={error} />}
      {goals.isError && <ErrorNote message={goals.error.message} onRetry={() => goals.refetch()} />}
      {goals.isSuccess && goals.data.length === 0 && (
        <EmptyState title="No goals to grow yet" detail="Start with a direction that feels meaningful to you." />
      )}
      {goals.data && goals.data.length > 0 && (
        <ul className="ruled sm:[&>li:last-child:nth-child(odd)]:col-span-2 sm:grid-cols-2">
          {goals.data.map((g) => {
            const ratio = g.target_value ? Math.min(1, g.current_value / g.target_value) : null;
            return (
              <li key={g.id} className="group space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {g.area && (
                      <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${AREA_TONE[g.area]}`}>
                        {AREAS.find((a) => a.value === g.area)?.label}
                      </span>
                    )}
                    <p className="font-medium break-words">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatAmount(g.current_value)}
                      {g.target_value ? ` of ${formatAmount(g.target_value)}` : ""} {g.unit ?? ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${g.title}`}
                    onClick={() => confirm(`Remove "${g.title}"?`) && remove.mutate(g.id)}
                    className="rounded p-1 text-muted-foreground opacity-60 hover:bg-muted group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {ratio !== null && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${ratio * 100}%` }} />
                  </div>
                )}
                <div className="flex gap-1.5">
                  <Button size="xs" variant="outline" onClick={() => progress.mutate({ id: g.id, amount: 1 })}>
                    + progress
                  </Button>
                  {g.current_value > 0 && (
                    <Button size="xs" variant="ghost" onClick={() => progress.mutate({ id: g.id, amount: -1 })}>
                      undo
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-foreground">A goal can be a direction, not a deadline.</p>

      <Modal open={adding} title="A goal worth growing" onClose={() => setAdding(false)}>
        <GoalForm onSave={(v) => add.mutate(v, { onSuccess: () => setAdding(false) })} />
      </Modal>
    </Card>
  );
}

function GoalForm({ onSave }: { onSave: (v: { title: string; area: Area | null; target: number | null; unit: string }) => void }) {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<Area | null>(null);
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const targetNum = target === "" ? null : Number(target);
  const valid = title.trim() && (targetNum === null || (targetNum > 0 && targetNum <= 1_000_000_000));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ title, area, target: targetNum, unit });
      }}
    >
      <Field label="What's on your mind?">
        <Input placeholder="Read 12 books this year" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div>
        <p className="mb-2 text-xs font-semibold">Area</p>
        <ChoicePills label="Area" options={AREAS} value={area} onChange={setArea} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target" hint="Optional">
          <Input type="number" inputMode="decimal" min={0} value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Unit" hint="Optional">
          <Input placeholder="books" maxLength={20} value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={!valid}>
        Save this goal
      </Button>
    </form>
  );
}

export function MovementLog({ today }: { today: string }) {
  const qc = useQueryClient();
  const [activity, setActivity] = useState("");
  const [minutes, setMinutes] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["movement", today], queryFn: () => fetchMovement(today) });
  const opts = {
    onError: (e: Error) => setError(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["movement"] }),
  };
  const add = useMutation({ mutationFn: (v: { activity: string; minutes: number }) => logMovement(today, v.activity, v.minutes), ...opts });
  const remove = useMutation({ mutationFn: deleteMovement, ...opts });
  const mins = Number(minutes);
  const valid = activity.trim() && Number.isFinite(mins) && mins > 0 && mins <= 1440;

  return (
    <Card>
      <SectionTitle icon={Footprints} title="Movement log" />
      <p className="mb-3 text-sm text-muted-foreground">Walk, stretch, dance around the kitchen. It all counts.</p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          setError(null);
          add.mutate({ activity, minutes: mins }, { onSuccess: () => setActivity("") });
        }}
      >
        <Input
          aria-label="What did you do?"
          placeholder="What did you do?"
          maxLength={80}
          className="min-w-40 flex-1"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        />
        <Input
          aria-label="Minutes"
          type="number"
          min={1}
          max={1440}
          className="w-20"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <Button type="submit" disabled={!valid || add.isPending}>
          Save
        </Button>
      </form>
      {error && <div className="mt-3"><ErrorNote message={error} /></div>}
      <div className="mt-4">
        {query.isSuccess && query.data.length === 0 ? (
          <EmptyState title="Your movement, your rules" detail="No streaks required. Make it yours." />
        ) : (
          <ul className="divide-y">
            {(query.data ?? []).map((m) => (
              <li key={m.id} className="group flex items-center gap-3 py-2 text-sm">
                <span className="flex-1">{m.activity ?? "Movement"}</span>
                <span className="text-muted-foreground">{m.minutes} min</span>
                <span className="w-24 text-right text-xs text-muted-foreground">
                  {daysBetween(m.log_date, today) <= 1
                    ? relativeDay(m.log_date, today)
                    : formatDate(m.log_date, { day: "numeric", month: "short" })}
                </span>
                <button
                  type="button"
                  aria-label="Remove entry"
                  onClick={() => remove.mutate(m.id)}
                  className="rounded p-1 text-muted-foreground opacity-60 hover:bg-muted group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Rest is part of the rhythm. Your progress can bend around real life.</p>
    </Card>
  );
}
