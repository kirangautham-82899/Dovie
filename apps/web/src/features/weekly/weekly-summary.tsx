"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WeekBars } from "@/components/charts";
import { BarChart3, CheckCircle2, Leaf, Lightbulb, Moon, Repeat, Share2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { EmptyState, ErrorNote, SectionTitle } from "@/components/page-header";
import { moodLabel } from "@/features/checkin/mood";
import { formatDate } from "@/lib/dates";
import { fetchWeek, type WeekSummary } from "./api";
import { WeekPredictor } from "./week-predictor";

const short = (d: string) => formatDate(d, { weekday: "short" });

function shareText(w: WeekSummary) {
  const parts = [`This week on Dovie: ${w.tasksDone} of ${w.tasksPlanned} plans done`];
  if (w.habitRhythm !== null) parts.push(`${Math.round(w.habitRhythm)}% habit rhythm`);
  if (w.focusMinutes) parts.push(`${w.focusMinutes} minutes of focus`);
  if (w.movementMinutes) parts.push(`${w.movementMinutes} minutes of movement`);
  return `${parts.join(", ")}. One little win at a time.`;
}

export function WeeklySummary({ today }: { today: string }) {
  const query = useQuery({ queryKey: ["week", today], queryFn: () => fetchWeek(today) });
  const [shareNote, setShareNote] = useState<string | null>(null);

  if (query.isPending) return <p className="text-sm text-muted-foreground">Gathering your week…</p>;
  if (query.isError)
    return <ErrorNote message={`This week is taking a moment: ${query.error.message}`} onRetry={() => query.refetch()} />;

  const w = query.data;
  const chart = w.days.map((d) => ({ day: short(d.day), done: d.tasks_done, open: Math.max(0, d.tasks_planned - d.tasks_done) }));

  async function share() {
    const text = shareText(w);
    try {
      if (navigator.share) {
        await navigator.share({ title: "My week on Dovie", text });
        setShareNote("Shared your week, just the totals.");
      } else {
        await navigator.clipboard.writeText(text);
        setShareNote("Copied a small weekly summary.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setShareNote("Could not share this time. Try again when you're ready.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={share}>
          <Share2 /> Share a small win
        </Button>
        <span className="text-xs text-muted-foreground">{shareNote ?? "Sharing includes only totals, never journal words."}</span>
      </div>

      <div className="ruled grid-cols-2 lg:grid-cols-4">
        <StatTile icon={CheckCircle2} label="Plans completed" value={`${w.tasksDone}`} caption={`of ${w.tasksPlanned} plans`} tone="rose" />
        <StatTile
          icon={Repeat}
          label="Habit rhythm"
          value={w.habitRhythm === null ? "—" : `${Math.round(w.habitRhythm)}%`}
          caption="of habit check-offs"
          tone="peach"
        />
        <StatTile
          icon={Moon}
          label="Rest, on average"
          value={w.averageSleep === null ? "—" : `${w.averageSleep.toFixed(1)}h`}
          caption="sleep logged"
          tone="sky"
        />
        <StatTile icon={Timer} label="Focus time" value={`${w.focusMinutes}`} caption="minutes, in your own time" tone="lilac" />
      </div>

      <WeekPredictor history={w.history} />

      <div className="ruled lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionTitle icon={BarChart3} title="The week, day by day" />
          {w.tasksPlanned === 0 ? (
            <EmptyState title="Nothing planned this week yet" detail="Add a few plans on Today and they'll show up here." />
          ) : (
            <>
              <div className="h-52 w-full" aria-hidden>
                <WeekBars data={chart} />
              </div>
              <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <i className="size-2.5 rounded-sm bg-chart-1" /> Done
                </span>
                <span className="flex items-center gap-1">
                  <i className="size-2.5 rounded-sm bg-muted" /> Still open
                </span>
              </div>
              <ul className="sr-only">
                {w.days.map((d) => (
                  <li key={d.day}>
                    {formatDate(d.day, { weekday: "long" })}: {d.tasks_done} of {d.tasks_planned} plans done
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="border-t-2 border-t-primary">
          <SectionTitle icon={Leaf} title="A few observations" />
          <p className="-mt-1 mb-3 text-xs opacity-80">
            Rules-based notes from numbers and completions only. Journal text is never included.
          </p>
          {w.observations.length ? (
            <ul className="space-y-2.5 text-sm">
              {w.observations.map((o) => (
                <li key={o} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  {o}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-80">More tracked days will help us notice a pattern.</p>
          )}
          {w.suggestions.length > 0 && (
            <div className="mt-4 border-t border-current/15 pt-3">
              <p className="mb-2 text-[0.68rem] font-bold tracking-[0.15em] uppercase opacity-80">If it feels useful</p>
              <ul className="space-y-2 text-sm">
                {w.suggestions.map((s) => (
                  <li key={s} className="flex gap-2 opacity-90">
                    <Lightbulb className="mt-0.5 size-4 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="ruled lg:grid-cols-2">
        <Card>
          <SectionTitle title="How you felt" />
          <ul className="grid grid-cols-7 gap-1 text-center text-[0.7rem]">
            {w.days.map((d) => (
              <li key={d.day} className="space-y-1">
                <span className="block text-muted-foreground">{short(d.day)}</span>
                <span className="block border-b-2 border-primary/30 py-1.5">{moodLabel(d.mood) || "–"}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="border-l-2 border-primary/30 pl-2 text-left">
              <dt className="text-[0.65rem] text-muted-foreground">Mood average</dt>
              <dd className="font-serif text-lg">{w.averageMood === null ? "—" : moodLabel(Math.round(w.averageMood))}</dd>
            </div>
            <div className="border-l-2 border-primary/30 pl-2 text-left">
              <dt className="text-[0.65rem] text-muted-foreground">Water logged</dt>
              <dd className="font-serif text-lg">{w.waterGlasses}</dd>
            </div>
            <div className="border-l-2 border-primary/30 pl-2 text-left">
              <dt className="text-[0.65rem] text-muted-foreground">Journal days</dt>
              <dd className="font-serif text-lg">{w.journalDays}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <SectionTitle title="Habits this week" />
          {w.habits.length === 0 ? (
            <EmptyState title="No habits yet" detail="Add one on the Goals page." />
          ) : (
            <ul className="space-y-3">
              {w.habits.map((h) => (
                <li key={h.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="min-w-0 break-words">{h.title}</span>
                    <span className="shrink-0 text-muted-foreground">{h.daysDone} / 7 days</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(h.daysDone / 7) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
