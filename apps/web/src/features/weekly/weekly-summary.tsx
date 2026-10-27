"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Footprints,
  Leaf,
  Lightbulb,
  Moon,
  NotebookPen,
  Repeat,
  Share2,
  Smile,
  Star,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, PageHeader, SectionTitle } from "@/components/page-header";
import { Slip, Sticky, StickyValue } from "@/components/notebook";
import { moodLabel } from "@/features/checkin/mood";
import { addDays, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { fetchWeek, type ReviewDay, type WeekSummary } from "./api";
import { WeekPredictor } from "./week-predictor";

/** Header copy, shared with the loading skeleton so the page doesn't jump. */
export const WEEKLY_HEADER = {
  eyebrow: "a gentle look back",
  title: "Your week, with",
  accent: "kindness.",
};

const MOOD_DOT: Record<number, string> = {
  1: "bg-sky-foreground/70",
  2: "bg-lilac-foreground/60",
  3: "bg-butter-foreground/60",
  4: "bg-mint-foreground/70",
  5: "bg-primary",
};

const PROMPTS = [
  { id: "good", label: "What went well?", placeholder: "Finished the report a day early…" },
  { id: "hard", label: "What felt heavy?", placeholder: "Mornings were rushed…" },
  { id: "next", label: "One small intention for next week", placeholder: "Lights out by 11 on weeknights" },
] as const;
type Reflection = Record<(typeof PROMPTS)[number]["id"], string>;

const weekKey = (end: string) => ["week", end];

function shareText(w: WeekSummary) {
  const parts = [`This week on Dovie: ${w.tasksDone} of ${w.tasksPlanned} plans done`];
  if (w.habitRhythm !== null) parts.push(`${Math.round(w.habitRhythm)}% habit rhythm`);
  if (w.focusMinutes) parts.push(`${w.focusMinutes} minutes of focus`);
  if (w.movementMinutes) parts.push(`${w.movementMinutes} minutes of movement`);
  return `${parts.join(", ")}. One little win at a time.`;
}

/** "↑ 3 from last week", kept soft: a dip is just "last week: 12". */
function delta(now: number | null, before: number | null, unit = "", digits = 0) {
  if (now === null || before === null) return null;
  const d = now - before;
  const f = (n: number) => `${n.toFixed(digits)}${unit}`;
  if (Math.abs(d) < (digits ? 0.1 : 1)) return "same as last week";
  return d > 0 ? `↑ ${f(d)} on last week` : `last week: ${f(before)}`;
}

/** One sentence that sums the week up, built from its numbers. */
function headline(w: WeekSummary) {
  const rate = w.tasksPlanned ? w.tasksDone / w.tasksPlanned : null;
  const mood = w.averageMood !== null ? moodLabel(Math.round(w.averageMood)).toLowerCase() : null;
  const tone =
    rate === null && w.checkinDays === 0
      ? "A quiet week"
      : rate !== null && rate >= 0.75
        ? "A strong week"
        : rate !== null && rate >= 0.45
          ? "A steady week"
          : "A gentler week";
  const bits: string[] = [];
  if (w.tasksPlanned) bits.push(`${w.tasksDone} of ${w.tasksPlanned} plans done`);
  if (w.habitRhythm !== null) bits.push(`habits at ${Math.round(w.habitRhythm)}%`);
  if (w.averageSleep !== null) bits.push(`${w.averageSleep.toFixed(1)}h of sleep a night`);
  const tail = mood ? `, and you felt mostly ${mood}` : "";
  return { tone, text: bits.length ? `${bits.join(", ")}${tail}.` : "Log a few plans or check-ins and this page fills in." };
}

function useReflection(end: string) {
  const key = `dovie.weekly.reflection.${end}`;
  const read = (): Reflection => {
    try {
      return { good: "", hard: "", next: "", ...JSON.parse(localStorage.getItem(key) ?? "{}") };
    } catch {
      return { good: "", hard: "", next: "" };
    }
  };
  const [state, setState] = useState<{ key: string; value: Reflection }>(() => ({ key, value: read() }));
  // A different week has its own notes.
  const value = state.key === key ? state.value : read();
  const set = (id: keyof Reflection, text: string) => {
    const next = { ...value, [id]: text };
    setState({ key, value: next });
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };
  return { value, set };
}

export function WeeklySummary({ today }: { today: string }) {
  const qc = useQueryClient();
  const [end, setEnd] = useState(today);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const query = useQuery({ queryKey: weekKey(end), queryFn: () => fetchWeek(end), placeholderData: (prev) => prev });
  const isThisWeek = end === today;

  // Warm the week before so stepping back feels instant.
  useEffect(() => {
    const prev = addDays(end, -7);
    void qc.prefetchQuery({ queryKey: weekKey(prev), queryFn: () => fetchWeek(prev) });
  }, [end, qc]);

  useEffect(() => {
    if (!shareNote) return;
    const t = setTimeout(() => setShareNote(null), 4000);
    return () => clearTimeout(t);
  }, [shareNote]);

  const range = `${formatDate(addDays(end, -6), { day: "numeric", month: "short" })} – ${formatDate(end, { day: "numeric", month: "short" })}`;

  async function share(w: WeekSummary) {
    const text = shareText(w);
    try {
      if (navigator.share) {
        await navigator.share({ title: "My week on Dovie", text });
        setShareNote("Shared your week, just the totals.");
      } else {
        await navigator.clipboard.writeText(text);
        setShareNote("Copied. Only totals, never journal words.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setShareNote("Could not share this time.");
    }
  }

  const header = (
    <PageHeader
      compact
      {...WEEKLY_HEADER}
      eyebrow={`weekly review · ${range}`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Change week" className="flex items-center rounded-full border bg-card/80 p-0.5 shadow-soft">
            <Button size="icon-sm" variant="ghost" aria-label="Previous week" onClick={() => setEnd(addDays(end, -7))}>
              <ChevronLeft />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-3" disabled={isThisWeek} onClick={() => setEnd(today)}>
              This week
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Next week"
              disabled={isThisWeek}
              onClick={() => setEnd(addDays(end, 7) > today ? today : addDays(end, 7))}
            >
              <ChevronRight />
            </Button>
          </div>
          <Button variant="solid" disabled={!query.data} onClick={() => query.data && share(query.data)}>
            <Share2 /> {shareNote ? "Done" : "Share a win"}
          </Button>
        </div>
      }
    />
  );

  if (query.isPending)
    return (
      <>
        {header}
        <p className="text-sm text-muted-foreground">Gathering your week…</p>
      </>
    );
  if (query.isError)
    return (
      <>
        {header}
        <ErrorNote message={`This week is taking a moment: ${query.error.message}`} onRetry={() => query.refetch()} />
      </>
    );

  const w = query.data;
  const prev = w.previous;
  const h = headline(w);

  return (
    <div className={cn("transition-opacity", query.isPlaceholderData && "opacity-60")}>
      {header}

      {shareNote && (
        <p role="status" className="-mt-3 mb-4 text-right text-xs text-muted-foreground">
          {shareNote}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 md:grid-cols-4">
        <Sticky
          label="Plans done"
          icon={CheckCircle2}
          caption={delta(w.tasksDone, prev.tasksDone) ?? `of ${w.tasksPlanned} planned`}
          tilt="-rotate-1 [--tape-tilt:-4deg]"
          tone="bg-blush text-foreground"
        >
          <StickyValue value={w.tasksDone} unit={`of ${w.tasksPlanned}`} className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Habit rhythm"
          icon={Repeat}
          caption={delta(w.habitRhythm, prev.habitRhythm, "%") ?? "add a habit to see"}
          tilt="rotate-1 [--tape-tilt:3deg]"
          tone="bg-mint text-mint-foreground"
        >
          <StickyValue value={w.habitRhythm === null ? "–" : Math.round(w.habitRhythm)} unit={w.habitRhythm === null ? undefined : "%"} className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Rest"
          icon={Moon}
          caption={delta(w.averageSleep, prev.averageSleep, "h", 1) ?? "log sleep to see"}
          tilt="-rotate-[0.5deg] [--tape-tilt:-2deg]"
          tone="bg-sky text-sky-foreground"
        >
          <StickyValue value={w.averageSleep === null ? "–" : w.averageSleep.toFixed(1)} unit={w.averageSleep === null ? undefined : "h a night"} className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Focus"
          icon={Timer}
          caption={delta(w.focusMinutes, prev.focusMinutes, " min") ?? "in your own time"}
          tilt="rotate-[1.5deg] [--tape-tilt:4deg]"
          tone="bg-lilac text-lilac-foreground"
        >
          <StickyValue value={w.focusMinutes} unit="min" className="text-3xl sm:text-4xl" />
        </Sticky>
      </div>

      <div className="mt-8 space-y-5">
        <Slip className="relative overflow-hidden p-5 sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-blush opacity-70 blur-2xl" />
          <div className="relative">
            <p className="font-hand text-2xl leading-none text-secondary-foreground">{h.tone}</p>
            <p className="mt-2 max-w-3xl font-serif text-xl leading-snug tracking-tight sm:text-2xl">{h.text}</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs">
              <Chip icon={Droplets} text={`${w.waterGlasses} glasses of water`} />
              <Chip icon={Footprints} text={`${w.movementMinutes} min of movement`} />
              <Chip icon={BookOpen} text={`wrote on ${w.journalDays} ${w.journalDays === 1 ? "day" : "days"}`} />
              <Chip icon={Smile} text={`checked in ${w.checkinDays} of 7 days`} />
            </ul>
          </div>
        </Slip>

        <DayStrip days={w.days} today={today} />

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <Slip className="p-4 sm:p-5">
            <SectionTitle icon={Leaf} title="What Dovie noticed" />
            <p className="-mt-1 mb-3 text-xs text-muted-foreground">From numbers and completions only. Journal text is never read.</p>
            {w.observations.length ? (
              <ul className="space-y-2.5 text-sm">
                {w.observations.map((o) => (
                  <li key={o} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint-foreground" />
                    {o}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">More tracked days will help notice a pattern.</p>
            )}
            {w.suggestions.length > 0 && (
              <div className="mt-4 border-t border-dashed pt-3">
                <p className="mb-2 font-hand text-lg leading-none text-muted-foreground">if it feels useful</p>
                <ul className="space-y-2 text-sm">
                  {w.suggestions.map((s) => (
                    <li key={s} className="flex gap-2">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-butter-foreground" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Slip>

          <Slip className="p-4 sm:p-5">
            <SectionTitle icon={Repeat} title="Habits, day by day" />
            {w.habits.length === 0 ? (
              <EmptyState title="No habits yet" detail="Add one on the Goals page and its week shows here." />
            ) : (
              <ul className="space-y-2.5">
                {w.habits.map((hb) => (
                  <li key={hb.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{hb.title}</p>
                      <p className="text-[0.7rem] text-muted-foreground">
                        {hb.daysDone}/7 days{hb.streak >= 2 && isThisWeek ? ` · ${hb.streak}-day streak` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1" aria-label={`${hb.title}: ${hb.daysDone} of 7 days`}>
                      {w.days.map((d) => {
                        const done = hb.dates.includes(d.day);
                        return (
                          <span
                            key={d.day}
                            title={`${formatDate(d.day, { weekday: "short" })}: ${done ? "done" : "not logged"}`}
                            className={cn(
                              "flex size-5 items-center justify-center rounded-full text-[0.55rem] font-semibold",
                              done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {formatDate(d.day, { weekday: "narrow" })}
                          </span>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Slip>
        </div>

        <ReflectionCard key={end} end={end} />

        {isThisWeek && <WeekPredictor history={w.history} />}
      </div>
    </div>
  );
}

function Chip({ icon: Icon, text }: { icon: typeof Moon; text: string }) {
  return (
    <li className="flex items-center gap-1.5 rounded-full border bg-card/80 px-2.5 py-1">
      <Icon className="size-3.5 text-primary" /> {text}
    </li>
  );
}

/** Seven columns, one per day: plans as a filled bar, then mood, sleep and the little extras. */
function DayStrip({ days, today }: { days: ReviewDay[]; today: string }) {
  const max = Math.max(1, ...days.map((d) => d.tasks_planned));
  const best = days.reduce<ReviewDay | null>((b, d) => (d.tasks_done > 0 && (!b || d.tasks_done > b.tasks_done) ? d : b), null);
  return (
    <Slip className="p-4 sm:p-5">
      <SectionTitle
        icon={NotebookPen}
        title="Day by day"
        aside={
          <span className="flex items-center gap-3 text-[0.7rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <i className="size-2.5 rounded-sm bg-primary" /> done
            </span>
            <span className="flex items-center gap-1">
              <i className="size-2.5 rounded-sm bg-muted" /> open
            </span>
          </span>
        }
      />
      <ol className="grid grid-cols-7 gap-1.5 sm:gap-3">
        {days.map((d) => {
          const open = Math.max(0, d.tasks_planned - d.tasks_done);
          const isBest = best?.day === d.day;
          return (
            <li
              key={d.day}
              aria-label={`${formatDate(d.day, { weekday: "long" })}: ${d.tasks_done} of ${d.tasks_planned} plans done${d.mood ? `, felt ${moodLabel(d.mood).toLowerCase()}` : ""}${d.sleep_hours !== null ? `, slept ${d.sleep_hours} hours` : ""}`}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-lg border border-transparent px-0.5 py-2 text-center",
                d.day === today && "border-primary/30 bg-primary/[0.05]",
              )}
            >
              {isBest && <Star aria-hidden className="absolute top-1 right-1 size-3 fill-butter-foreground/70 text-butter-foreground/70" />}
              <span className="text-[0.62rem] font-bold tracking-widest text-muted-foreground uppercase">
                {formatDate(d.day, { weekday: "short" })}
              </span>
              <span className="font-serif text-lg leading-none">{formatDate(d.day, { day: "numeric" })}</span>
              <div className="flex h-24 w-5 flex-col-reverse overflow-hidden rounded-full bg-muted sm:w-7" aria-hidden>
                <div className="bg-primary transition-all duration-500" style={{ height: `${(d.tasks_done / max) * 100}%` }} />
                <div className="bg-primary/20" style={{ height: `${(open / max) * 100}%` }} />
              </div>
              <span className="text-[0.7rem] tabular-nums">
                {d.tasks_planned ? `${d.tasks_done}/${d.tasks_planned}` : "–"}
              </span>
              <span
                aria-hidden
                title={d.mood ? moodLabel(d.mood) : "No check-in"}
                className={cn("size-2.5 rounded-full", d.mood ? MOOD_DOT[d.mood] : "border border-dashed border-muted-foreground/40")}
              />
              <span className="hidden text-[0.65rem] text-muted-foreground sm:block">
                {d.sleep_hours !== null ? `${d.sleep_hours}h` : " "}
              </span>
              <span className="flex h-3 items-center gap-0.5 text-muted-foreground" aria-hidden>
                {d.movement_minutes > 0 && <Footprints className="size-3" />}
                {d.focus_minutes > 0 && <Timer className="size-3" />}
                {d.journaled && <BookOpen className="size-3" />}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-muted-foreground">
        <span className="flex items-center gap-1">
          mood:
          {[1, 2, 3, 4, 5].map((m) => (
            <i key={m} title={moodLabel(m)} className={cn("size-2 rounded-full", MOOD_DOT[m])} />
          ))}
        </span>
        <span className="flex items-center gap-1">
          <Star className="size-3 fill-butter-foreground/70 text-butter-foreground/70" /> fullest day
        </span>
        <span className="flex items-center gap-1">
          <Footprints className="size-3" /> moved <Timer className="ml-1 size-3" /> focused <BookOpen className="ml-1 size-3" /> wrote
        </span>
      </p>
    </Slip>
  );
}

function ReflectionCard({ end }: { end: string }) {
  const r = useReflection(end);
  const filled = PROMPTS.filter((p) => r.value[p.id].trim()).length;
  return (
    <Slip className="p-4 sm:p-5">
      <SectionTitle
        icon={NotebookPen}
        title="Close the week"
        aside={<span className="text-xs text-muted-foreground">{filled}/3 · saved on this device</span>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {PROMPTS.map((p) => (
          <label key={p.id} className="block">
            <span className="mb-1.5 block font-hand text-xl leading-none">{p.label}</span>
            <textarea
              rows={3}
              maxLength={400}
              placeholder={p.placeholder}
              value={r.value[p.id]}
              onChange={(e) => r.set(p.id, e.target.value)}
              className="w-full resize-none rounded-lg border bg-[repeating-linear-gradient(transparent,transparent_23px,var(--border)_24px)] bg-background px-3 py-1 text-sm leading-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        ))}
      </div>
    </Slip>
  );
}
