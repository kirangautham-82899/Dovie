"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Habit } from "./api";
import { StreakBadge } from "./streak-badge";
import { useHabits } from "./use-habits";

const TITLE_MAX = 100;

/** The last 7 calendar days ending on `today` (YYYY-MM-DD), oldest first. */
function lastSevenDays(today: string): string[] {
  const end = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function HabitRow({
  habit,
  days,
  onRename,
  onDelete,
}: {
  habit: Habit;
  days: string[];
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(habit.title);

  function commit() {
    const title = draft.trim();
    setEditing(false);
    if (title && title !== habit.title) onRename(title);
  }

  return (
    <li className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        {editing ? (
          <form
            className="flex flex-1 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              commit();
            }}
          >
            <Input
              autoFocus
              aria-label="Habit name"
              maxLength={TITLE_MAX}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              className="h-8"
            />
            <Button type="submit" size="icon-sm" variant="ghost" aria-label="Save">
              <Check />
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setEditing(false)}>
              <X />
            </Button>
          </form>
        ) : confirming ? (
          <div className="flex flex-1 items-center justify-between gap-2 text-sm">
            <span>Delete &quot;{habit.title}&quot;?</span>
            <span className="flex gap-1">
              <Button size="sm" variant="destructive" onClick={onDelete}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </span>
          </div>
        ) : (
          <>
            <span className="min-w-0 flex-1 break-words text-sm font-medium">{habit.title}</span>
            <StreakBadge streak={habit.streak} />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Rename habit"
              onClick={() => {
                setDraft(habit.title);
                setEditing(true);
              }}
            >
              <Pencil />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Delete habit" onClick={() => setConfirming(true)}>
              <Trash2 />
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-label="Last 7 days">
          {days.map((d) => {
            const done = habit.recent_dates.includes(d);
            return (
              <span
                key={d}
                title={d}
                className={cn("size-3 rounded-full", done ? "bg-primary" : "bg-muted")}
                aria-label={`${d}: ${done ? "done" : "not done"}`}
              />
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">Best streak: {habit.best}</span>
      </div>
    </li>
  );
}

export function HabitsManager({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const { query, add, rename, remove } = useHabits(today, setError);
  const days = lastSevenDays(today);
  const habits = query.data ?? [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setError(null);
    add.mutate(value, { onSuccess: () => setTitle("") });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Habits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            aria-label="New habit"
            placeholder="e.g. Drink 2L of water"
            maxLength={TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit" size="icon" aria-label="Add habit" disabled={add.isPending || !title.trim()}>
            <Plus />
          </Button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {query.isPending && <p className="text-sm text-muted-foreground">Loading...</p>}
        {query.isError && <p className="text-sm text-destructive">Could not load habits: {query.error.message}</p>}
        {query.isSuccess && habits.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Start small: one habit you can do every day. You log it in one tap from Today.
          </p>
        )}

        {habits.length > 0 && (
          <ul className="space-y-2">
            {habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                days={days}
                onRename={(next) => {
                  setError(null);
                  rename.mutate({ id: h.id, title: next });
                }}
                onDelete={() => {
                  setError(null);
                  remove.mutate(h.id);
                }}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
