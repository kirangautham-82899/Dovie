"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BreakdownRow, CheckinState } from "./api";
import { MOODS, SCORE_CATEGORIES, moodLabel, scoreMessage } from "./mood";
import { useCheckin } from "./use-checkin";

function Breakdown({ rows }: { rows: BreakdownRow[] }) {
  const planned = rows.filter((r) => r.total > 0);
  if (planned.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {planned.map((r) => (
        <li key={r.category} className="flex justify-between">
          <span>{SCORE_CATEGORIES[r.category]?.label ?? r.category}</span>
          <span>
            {Math.round(r.done * 10) / 10} of {r.total}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CheckinForm({
  state,
  saving,
  onSave,
}: {
  state: CheckinState;
  saving: boolean;
  onSave: (mood: number, note: string) => void;
}) {
  const [mood, setMood] = useState<number | null>(state.checkin?.mood ?? null);
  const [note, setNote] = useState(state.checkin?.note ?? "");
  const checkedIn = state.checkin !== null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (mood !== null) onSave(mood, note);
      }}
    >
      <div>
        <p id="mood-label" className="mb-2 text-sm">
          How was your day?
        </p>
        <div role="radiogroup" aria-labelledby="mood-label" className="grid grid-cols-5 gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mood === m.value}
              onClick={() => setMood(m.value)}
              className={cn(
                "rounded-xl border px-1 py-2 text-xs transition-colors",
                mood === m.value ? "border-primary bg-secondary font-medium" : "bg-card hover:bg-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        aria-label="A note about your day (optional)"
        placeholder="One win today (optional)"
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="border-l-2 border-primary/30 py-1 pl-3">
        <p className="mb-2 text-sm">
          {checkedIn ? "Score if you update now: " : "Today so far: "}
          <span className="font-semibold">{state.liveScore === null ? "no score yet" : `${state.liveScore}/100`}</span>
        </p>
        <Breakdown rows={state.breakdown} />
      </div>

      <Button type="submit" className="h-10 w-full" disabled={mood === null || saving}>
        {saving ? "Saving..." : checkedIn ? "Update check-in" : "Check in"}
      </Button>
    </form>
  );
}

export function CheckinCard({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const { query, save } = useCheckin(today, setError);
  const state = query.data;
  const checkin = state?.checkin;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evening check-in</CardTitle>
        <p className="text-xs text-muted-foreground">A gentle guide, not a measure of your day.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isPending && <p className="text-sm text-muted-foreground">Loading...</p>}

        {query.isError && (
          <div className="space-y-2 text-sm">
            <p className="text-destructive">Could not load your check-in: {query.error.message}</p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {state && checkin && !editing && (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold text-primary">{checkin.score ?? "--"}</span>
              {checkin.score !== null && <span className="pb-1 text-sm text-muted-foreground">/ 100</span>}
              <span className="ml-auto pb-1 text-sm text-muted-foreground">Felt {moodLabel(checkin.mood).toLowerCase()}</span>
            </div>
            <p className="text-sm">{scoreMessage(checkin.score)}</p>
            {checkin.note && <p className="text-sm text-muted-foreground">&ldquo;{checkin.note}&rdquo;</p>}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Update
              </Button>
              <Link href="/weekly" className="text-sm underline">
                See your week
              </Link>
            </div>
          </div>
        )}

        {state && (!checkin || editing) && (
          <CheckinForm
            state={state}
            saving={save.isPending}
            onSave={(mood, note) => {
              setError(null);
              save.mutate({ mood, note }, { onSuccess: () => setEditing(false) });
            }}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
