"use client";

import { useState } from "react";
import { Footprints, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorNote, SectionTitle } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { useWellness } from "./use-wellness";

/** One-tap energy, water and movement for the Today screen. */
export function WellnessToday({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);
  const { query, save, move } = useWellness(today, setError);
  const day = query.data;

  return (
    <Card>
      <SectionTitle icon={HeartPulse} title="A little check-in" />
      <p className="-mt-1 mb-4 text-xs text-muted-foreground">No right answer. Just notice how you are.</p>
      {query.isError && <ErrorNote message={query.error.message} onRetry={() => query.refetch()} />}
      {day && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Energy</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Energy">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={day.energy === n}
                  aria-label={`Energy ${n} of 5`}
                  onClick={() => save.mutate({ energy: n })}
                  className={cn(
                    "size-6 rounded-full border transition-colors",
                    day.energy !== null && day.energy >= n ? "border-primary bg-primary/70" : "hover:border-primary",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Glasses of water</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="One less glass"
                className="size-7 rounded-lg border"
                onClick={() => save.mutate({ water_glasses: Math.max(0, day.water_glasses - 1) })}
              >
                −
              </button>
              <span className="w-5 text-center text-sm">{day.water_glasses}</span>
              <button
                type="button"
                aria-label="One more glass"
                className="size-7 rounded-lg border"
                onClick={() => save.mutate({ water_glasses: Math.min(40, day.water_glasses + 1) })}
              >
                +
              </button>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full border-primary/30 text-primary"
            onClick={() => {
              move.mutate({ activity: "Movement break", minutes: 10 });
              setMoved(true);
            }}
          >
            <Footprints /> I moved a little
          </Button>
          {moved && (
            <p className="text-center text-xs text-primary">
              Ten minutes logged. Nice work. {day.movement_minutes > 0 && `${day.movement_minutes} min today.`}
            </p>
          )}
        </div>
      )}
      {error && <div className="mt-3"><ErrorNote message={error} /></div>}
    </Card>
  );
}
