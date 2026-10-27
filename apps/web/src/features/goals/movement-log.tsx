"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Footprints, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorNote, SectionTitle } from "@/components/page-header";
import { logMovement } from "@/features/wellness/api";
import { daysBetween, formatDate, relativeDay } from "@/lib/dates";
import { deleteMovement, fetchMovement } from "./api";

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
