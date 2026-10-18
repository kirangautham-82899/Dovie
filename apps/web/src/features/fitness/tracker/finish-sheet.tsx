"use client";

import { useState, useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flame, Footprints, HeartPulse, Mountain, Route, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoicePills } from "@/components/field";
import { activity, showsPace } from "./activities";
import { queueSession, saveSession } from "./api";
import { formatDuration, formatKm, formatPace, paceOf, routePath } from "./engine";
import type { FinishedWorkout } from "./live-store";
import { createStore } from "@/lib/local-store";

// The finished workout waits here (and in localStorage) until it is saved or
// discarded, so closing the app on the summary doesn't lose it.
const reviewStore = createStore<FinishedWorkout | null>(() => null, "dovie-fit-review");
export const setReview = (w: FinishedWorkout | null) => reviewStore.set(w);
export function useReview() {
  return useSyncExternalStore(reviewStore.subscribe, reviewStore.get, () => null);
}

const EFFORT = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Steady" },
  { value: 3, label: "Solid" },
  { value: 4, label: "Hard" },
  { value: 5, label: "All out" },
] as const;

function Stat({ icon: Icon, label, value, unit }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; unit?: string }) {
  return (
    <div className="p-3">
      <p className="flex items-center gap-1 text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
        <Icon className="size-3 text-primary" /> {label}
      </p>
      <p className="mt-1 font-serif text-2xl leading-none tabular-nums">
        {value}
        {unit && <span className="ml-1 font-sans text-xs text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

export function FinishSheet({ w, onSaved }: { w: FinishedWorkout; onSaved: (message: string) => void }) {
  const qc = useQueryClient();
  const [effort, setEffort] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const def = activity(w.activity);
  const Icon = def.icon;
  const path = routePath(w.route, 320, 120);
  const pace = paceOf(w.distanceM, w.durationS);

  const save = useMutation({
    mutationFn: () => saveSession(w, { effort, note }),
    onSuccess: () => {
      setReview(null);
      onSaved(`${def.label} saved.`);
    },
    onError: () => {
      // Offline or the session expired: keep it on this device and retry later.
      queueSession(w, { effort, note });
      setReview(null);
      onSaved(`${def.label} kept on this device. It will sync the next time you're online.`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["fitness-tracker"] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-label="Workout summary">
      <div
        style={{ "--act": def.hue } as React.CSSProperties}
        className="animate-rise max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="fit-start flex items-center gap-3 px-5 py-5 text-white">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/20">
            <Icon className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase opacity-85">
              {new Date(w.startedAt).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}
            </p>
            <h2 className="font-serif text-3xl leading-tight">{def.label} done. Nice.</h2>
          </div>
        </div>

        <div className="ruled grid-cols-3 border-x-0">
          <Stat icon={Timer} label="Time" value={formatDuration(w.durationS)} />
          {w.distanceM > 0 && <Stat icon={Route} label="Distance" value={formatKm(w.distanceM)} unit="km" />}
          {showsPace(w.activity) && pace && <Stat icon={Timer} label="Avg pace" value={formatPace(pace)} unit="/km" />}
          {w.steps > 0 && <Stat icon={Footprints} label="Steps" value={w.steps.toLocaleString("en-IN")} />}
          <Stat icon={Flame} label="Calories" value={w.calories} unit="kcal" />
          {w.avgHr && <Stat icon={HeartPulse} label="Avg HR" value={w.avgHr} unit="bpm" />}
          {w.elevGainM > 0 && <Stat icon={Mountain} label="Climb" value={Math.round(w.elevGainM)} unit="m" />}
        </div>

        <div className="space-y-4 p-5">
          {path && (
            <svg viewBox="0 0 320 120" className="h-28 w-full rounded-2xl bg-muted/60" aria-label="Your route">
              <path d={path} fill="none" stroke="hsl(var(--act) 70% 55%)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {w.splits.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Splits: {w.splits.map((t, i) => `km ${i + 1} ${formatPace(t)}`).join(" · ")}
            </p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold">How did it feel?</p>
            <ChoicePills label="Effort" options={EFFORT} value={effort as (typeof EFFORT)[number]["value"] | null} onChange={setEffort} />
          </div>
          <Input placeholder="A note for future you (optional)" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />

          {confirmDiscard ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-destructive/10 p-3 text-sm">
              <span>Discard this workout?</span>
              <span className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setConfirmDiscard(false)}>
                  Keep
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setReview(null);
                    onSaved("Workout discarded.");
                  }}
                >
                  Discard
                </Button>
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="lg" className="fit-start flex-1 text-white" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? "Saving…" : "Save workout"}
              </Button>
              <Button size="lg" variant="ghost" aria-label="Discard workout" onClick={() => setConfirmDiscard(true)}>
                <Trash2 />
              </Button>
            </div>
          )}
          <p className="text-[0.68rem] text-muted-foreground">Estimates from your phone&apos;s sensors. For tracking only, not medical advice.</p>
        </div>
      </div>
    </div>
  );
}
