"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StreakBadge } from "./streak-badge";
import { useHabits } from "./use-habits";

export function HabitsToday({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const { query, toggle } = useHabits(today, setError);
  const habits = query.data ?? [];
  const doneCount = habits.filter((h) => h.done_today).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Habits</CardTitle>
        {habits.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {doneCount} of {habits.length} done
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isPending && <p className="text-sm text-muted-foreground">Loading your habits...</p>}

        {query.isError && (
          <div className="space-y-2 text-sm">
            <p className="text-destructive">Could not load habits: {query.error.message}</p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {query.isSuccess && habits.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No habits yet.{" "}
            <Link href="/goals" className="underline">
              Add your first one
            </Link>
            .
          </p>
        )}

        {habits.length > 0 && (
          <ul>
            {habits.map((h) => (
              <li key={h.id} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={h.done_today}
                  aria-label={`${h.title}: ${h.done_today ? "done today" : "not done today"}`}
                  onClick={() => {
                    setError(null);
                    toggle.mutate({ id: h.id, done: !h.done_today });
                  }}
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    h.done_today
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary",
                  )}
                >
                  {h.done_today && <Check className="size-4" aria-hidden />}
                </button>
                <span className={cn("min-w-0 flex-1 break-words text-sm", h.done_today && "text-muted-foreground")}>
                  {h.title}
                </span>
                <StreakBadge streak={h.streak} />
              </li>
            ))}
          </ul>
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
