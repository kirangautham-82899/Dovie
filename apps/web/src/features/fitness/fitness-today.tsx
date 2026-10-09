"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FitnessGoal } from "./api";
import { MAX_AMOUNT, formatAmount } from "./format";
import { useFitness } from "./use-fitness";

type Actions = ReturnType<typeof useFitness>;

function GoalProgress({
  goal,
  log,
  reset,
  onClearError,
}: {
  goal: FitnessGoal;
  log: Actions["log"];
  reset: Actions["reset"];
  onClearError: () => void;
}) {
  const [amount, setAmount] = useState("");
  const remaining = Math.max(goal.target_value - goal.today_total, 0);
  const complete = remaining === 0;
  const percent = Math.min(100, Math.round((goal.today_total / goal.target_value) * 100));
  const parsed = Number(amount);
  const amountValid = amount !== "" && Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_AMOUNT;

  return (
    <li className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 break-words text-sm font-medium">{goal.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatAmount(goal.today_total)} / {formatAmount(goal.target_value)} {goal.unit}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`${goal.title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="flex items-center gap-2">
        <Input
          aria-label={`Amount of ${goal.unit} to log`}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder={goal.unit}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-24"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!amountValid}
          onClick={() => {
            onClearError();
            log.mutate({ id: goal.id, value: parsed });
            setAmount("");
          }}
        >
          Log
        </Button>
        {complete ? (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <Check className="size-3.5" aria-hidden /> Goal reached
          </span>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              onClearError();
              log.mutate({ id: goal.id, value: remaining });
            }}
          >
            Done
          </Button>
        )}
        {goal.today_total > 0 && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Reset today's ${goal.title}`}
            className="ml-auto"
            onClick={() => {
              onClearError();
              reset.mutate(goal.id);
            }}
          >
            <RotateCcw />
          </Button>
        )}
      </div>
    </li>
  );
}

export function FitnessToday({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const { query, log, reset } = useFitness(today, setError);
  const goals = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fitness goal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isPending && <p className="text-sm text-muted-foreground">Loading your goals...</p>}

        {query.isError && (
          <div className="space-y-2 text-sm">
            <p className="text-destructive">Could not load goals: {query.error.message}</p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {query.isSuccess && goals.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No fitness goal yet.{" "}
            <Link href="/goals" className="underline">
              Set a daily target
            </Link>
            .
          </p>
        )}

        {goals.length > 0 && (
          <ul className="space-y-2">
            {goals.map((g) => (
              <GoalProgress key={g.id} goal={g} log={log} reset={reset} onClearError={() => setError(null)} />
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="pt-1 text-[0.7rem] text-muted-foreground">For tracking only, not medical advice.</p>
      </CardContent>
    </Card>
  );
}
