"use client";

import { useEffect, useState } from "react";
import { Slip } from "@/components/notebook";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/page-header";
import { addDays, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { FEELINGS, STRESS, type MindLog } from "./mind-api";
import { Chips, Heading, MultiChips } from "./parts";
import { useMind } from "./use-body";

/** Mental health: a private daily check-in, two calming exercises and where to turn for support. */
export function MindTab({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const m = useMind(today, setError);
  const logs = m.query.data ?? [];

  return (
    <div className="space-y-8">
      {error && <ErrorNote message={error} />}
      {m.query.isError && <ErrorNote message={`Could not load your check-ins: ${m.query.error.message}`} onRetry={() => m.query.refetch()} />}

      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
        <Slip className="p-5 sm:p-6">
          <MindCheckin
            key={`${today}-${m.query.isPending}`}
            today={today}
            saved={logs.find((l) => l.log_date === today)}
            loading={m.query.isPending}
            saving={m.save.isPending}
            onSave={(v) => {
              setError(null);
              m.save.mutate(v);
            }}
          />
          <WeekStrip today={today} logs={logs} />
        </Slip>
        <Slip className="p-5 sm:p-6">
          <Breathing />
          <Grounding />
        </Slip>
      </div>

      <p className="border-l-2 border-primary py-1 pl-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">If things feel heavy,</span> you don&apos;t have to carry them alone. In India you can
        call Tele-MANAS on 14416 (free, any time), and anywhere, please reach out to someone you trust or your local emergency number if
        you might hurt yourself. Dovie is for tracking and isn&apos;t a substitute for professional care. What you write here is private to
        you and never used for insights.
      </p>
    </div>
  );
}

function MindCheckin({
  today,
  saved,
  loading,
  saving,
  onSave,
}: {
  today: string;
  saved: MindLog | undefined;
  loading: boolean;
  saving: boolean;
  onSave: (v: MindLog) => void;
}) {
  const [feelings, setFeelings] = useState<string[]>(saved?.feelings ?? []);
  const [stress, setStress] = useState<number | null>(saved?.stress ?? null);
  const [note, setNote] = useState(saved?.note ?? "");
  const [done, setDone] = useState(false);
  const touch = () => setDone(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ log_date: today, stress, feelings, note: note.trim() || null });
        setDone(true);
      }}
    >
      <Heading title="How is your mind today?" aside="private to you" />
      <div className="space-y-2">
        <p className="font-hand text-xl leading-none text-secondary-foreground">what are you feeling?</p>
        <MultiChips
          label="Feelings"
          options={FEELINGS}
          values={feelings}
          onToggle={(f) => {
            touch();
            setFeelings((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
          }}
        />
      </div>
      <div className="space-y-2">
        <p className="font-hand text-xl leading-none text-secondary-foreground">stress, from calm (1) to a lot (5)</p>
        <Chips
          label="Stress"
          options={STRESS}
          value={stress}
          onChange={(v) => {
            touch();
            setStress(v);
          }}
        />
      </div>
      <label className="block space-y-1 text-xs font-semibold">
        <span className="font-hand text-xl leading-none font-normal text-secondary-foreground">anything on your mind?</span>
        <textarea
          rows={3}
          maxLength={500}
          placeholder="A few words, only if you want to."
          value={note}
          onChange={(e) => {
            touch();
            setNote(e.target.value);
          }}
          className="mt-1 block w-full resize-none border-0 border-b border-foreground/25 bg-transparent px-0 text-sm leading-6 font-normal outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary"
        />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving || loading || (feelings.length === 0 && stress === null && !note.trim() && !saved)}>
          Save check-in
        </Button>
        {done && !saving && <span className="text-xs text-primary">Saved. Be gentle with yourself.</span>}
      </div>
    </form>
  );
}

/** The last seven days of stress as small bars, so a rough patch is easy to spot. */
function WeekStrip({ today, logs }: { today: string; logs: MindLog[] }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const byDate = new Map(logs.map((l) => [l.log_date, l]));

  return (
    <div className="mt-7 border-t border-foreground/10 pt-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">Stress this week</p>
      <ul className="grid grid-cols-7 gap-2" aria-label="Stress over the last seven days">
        {days.map((d) => {
          const stress = byDate.get(d)?.stress ?? null;
          const label = formatDate(d, { weekday: "long", day: "numeric", month: "short" });
          return (
            <li key={d} className="flex flex-col items-center gap-1.5" title={stress ? `${label}: ${stress} of 5` : `${label}: no check-in`}>
              <span className="flex h-14 w-full items-end">
                {stress ? (
                  <span className={cn("w-full bg-primary", d === today && "ring-1 ring-foreground/40")} style={{ height: `${(stress / 5) * 100}%` }} />
                ) : (
                  <span className="w-full border-b border-dashed border-foreground/25" />
                )}
              </span>
              <span className={cn("text-[0.65rem] text-muted-foreground", d === today && "font-bold text-foreground")}>
                {formatDate(d, { weekday: "short" }).slice(0, 2)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const PHASES = [
  { label: "Breathe in", full: true },
  { label: "Hold", full: true },
  { label: "Breathe out", full: false },
  { label: "Hold", full: false },
] as const;

/** Box breathing: in, hold, out, hold, four seconds each. */
function Breathing() {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setTick((t) => t + 1), 4000);
    return () => window.clearTimeout(id);
  }, [running, tick]);

  const phase = PHASES[tick % 4];
  const big = running && phase.full;

  return (
    <div>
      <Heading title="Breathe" aside="4 · 4 · 4 · 4" />
      <p className="mt-3 text-sm text-muted-foreground">Follow the circle for a few rounds. Slow is plenty.</p>
      <div className="my-6 flex h-44 flex-col items-center justify-center gap-4">
        <div
          aria-hidden
          className="size-28 rounded-full border border-primary bg-primary/25 ease-in-out motion-reduce:transition-none"
          style={{ transform: `scale(${big ? 1.45 : 0.75})`, transition: `transform ${running ? 4000 : 600}ms` }}
        />
        <p className="text-sm font-medium" aria-live="polite">
          {running ? phase.label : "Ready when you are"}
        </p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button
          variant={running ? "outline" : "default"}
          onClick={() => {
            setRunning((r) => !r);
            setTick(0);
          }}
        >
          {running ? "Stop" : "Start"}
        </Button>
        {running && tick >= 4 && <span className="text-xs text-muted-foreground">{Math.floor(tick / 4)} {Math.floor(tick / 4) === 1 ? "round" : "rounds"}</span>}
      </div>
    </div>
  );
}

const GROUNDING = [
  "5 things you can see",
  "4 things you can touch",
  "3 things you can hear",
  "2 things you can smell",
  "1 thing you can taste",
];

/** The 5-4-3-2-1 grounding exercise, folded away until wanted. */
function Grounding() {
  return (
    <details className="group mt-7 border-t border-foreground/10 pt-4">
      <summary className="cursor-pointer list-none font-serif text-lg tracking-tight [&::-webkit-details-marker]:hidden">
        <span className="highlighter -mx-1 px-1">Feeling overwhelmed? Ground yourself</span>
      </summary>
      <ol className="mt-3 space-y-1.5 text-sm">
        {GROUNDING.map((g, i) => (
          <li key={g} className="flex gap-3 border-b border-foreground/10 pb-1.5">
            <span className="w-4 font-serif text-muted-foreground">{i + 1}</span>
            {g}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">Name them out loud or in your head, slowly. Notice your feet on the floor.</p>
    </details>
  );
}
