"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FitnessGoal, FitnessGoalInput } from "./api";
import { MAX_AMOUNT, UNIT_SUGGESTIONS, formatAmount } from "./format";
import { useFitness } from "./use-fitness";

function GoalForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: FitnessGoal;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (input: FitnessGoalInput) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [target, setTarget] = useState(initial ? formatAmount(initial.target_value) : "");
  const [unit, setUnit] = useState(initial?.unit ?? "");

  const targetNumber = Number(target);
  const valid =
    title.trim().length > 0 &&
    unit.trim().length > 0 &&
    Number.isFinite(targetNumber) &&
    targetNumber > 0 &&
    targetNumber <= MAX_AMOUNT;

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({ title: title.trim(), target: targetNumber, unit: unit.trim() });
        if (!initial) {
          setTitle("");
          setTarget("");
          setUnit("");
        }
      }}
    >
      <Input
        aria-label="Goal name"
        placeholder="e.g. Daily walk"
        maxLength={100}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex gap-2">
        <Input
          aria-label="Daily target"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder="Daily target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <Input
          aria-label="Unit"
          list="fitness-units"
          placeholder="Unit (min, steps...)"
          maxLength={20}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <datalist id="fitness-units">
          {UNIT_SUGGESTIONS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!valid || pending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function FitnessManager({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { query, add, update, remove } = useFitness(today, setError);
  const goals = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fitness goals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          A fitness goal is a daily target. Log it from Today with one tap. For tracking only, not medical advice.
        </p>

        {query.isPending && <p className="text-sm text-muted-foreground">Loading...</p>}
        {query.isError && <p className="text-sm text-destructive">Could not load goals: {query.error.message}</p>}

        {goals.length > 0 && (
          <ul className="space-y-2">
            {goals.map((g) => (
              <li key={g.id} className="rounded-xl border bg-card p-3">
                {editingId === g.id ? (
                  <GoalForm
                    initial={g}
                    submitLabel="Save"
                    onCancel={() => setEditingId(null)}
                    onSubmit={(input) => {
                      setError(null);
                      update.mutate({ id: g.id, input });
                      setEditingId(null);
                    }}
                  />
                ) : confirmingId === g.id ? (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>Delete &quot;{g.title}&quot;?</span>
                    <span className="flex gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setError(null);
                          remove.mutate(g.id);
                          setConfirmingId(null);
                        }}
                      >
                        Delete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                        Keep
                      </Button>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium">{g.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatAmount(g.target_value)} {g.unit} per day
                      </span>
                    </span>
                    <Button size="icon-sm" variant="ghost" aria-label="Edit goal" onClick={() => setEditingId(g.id)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Delete goal" onClick={() => setConfirmingId(g.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {query.isSuccess && goals.length === 0 && (
          <p className="text-sm text-muted-foreground">No fitness goal yet. Add a small daily target to start.</p>
        )}

        <div className="border-t pt-3">
          <p className="mb-2 text-sm font-medium">Add a goal</p>
          <GoalForm
            submitLabel="Add goal"
            pending={add.isPending}
            onSubmit={(input) => {
              setError(null);
              add.mutate(input);
            }}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
