"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarHeart, Moon, Sparkles, TriangleAlert, Target } from "lucide-react";
import { SectionTitle } from "@/components/page-header";
import { AskDovie } from "@/components/ask-dovie";
import { moodLabel } from "@/features/checkin/mood";
import type { WeekSummary as AiWeekSummary } from "@/app/api/insights/weekly/route";
import { cn } from "@/lib/utils";
import type { ReviewDay } from "./api";
import { predictWeek, type MetricKey, type MetricPrediction, type WeekPrediction } from "./predict";

const UNIT: Record<MetricKey, string> = {
  completion: "% of plans",
  habits: "% of check-offs",
  sleep: "hours a night",
  focus: "minutes",
  movement: "minutes",
  mood: "1 to 5",
};

function format(key: MetricKey, v: number | null) {
  if (v === null) return "—";
  if (key === "completion" || key === "habits") return `${Math.round(v * 100)}%`;
  if (key === "sleep") return `${v.toFixed(1)}h`;
  if (key === "mood") return moodLabel(Math.round(v)) || v.toFixed(1);
  return `${Math.round(v)}`;
}

/** Four actual weeks as a solid line, next week as a dashed step. */
function Sparkline({ weeks, predicted }: { weeks: (number | null)[]; predicted: number | null }) {
  const values = [...weeks, predicted];
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return <div className="h-7" />;
  const min = Math.min(...known);
  const max = Math.max(...known);
  const W = 96;
  const H = 28;
  const x = (i: number) => (i / (values.length - 1)) * (W - 4) + 2;
  const y = (v: number) => (max === min ? H / 2 : H - 3 - ((v - min) / (max - min)) * (H - 6));
  const actual = weeks.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean);
  const lastIdx = weeks.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).at(-1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-24" aria-hidden>
      <polyline points={actual.join(" ")} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {predicted !== null && lastIdx !== undefined && (
        <>
          <line
            x1={x(lastIdx)}
            y1={y(weeks[lastIdx] as number)}
            x2={x(values.length - 1)}
            y2={y(predicted)}
            stroke="var(--chart-2)"
            strokeWidth="2"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
          <circle cx={x(values.length - 1)} cy={y(predicted)} r="2.5" fill="var(--chart-2)" />
        </>
      )}
    </svg>
  );
}

function MetricCell({ m }: { m: MetricPrediction }) {
  const Arrow = m.direction === "up" ? ArrowUpRight : m.direction === "down" ? ArrowDownRight : ArrowRight;
  // For every metric here, up is the hopeful direction.
  const tone = m.direction === "up" ? "text-mint-foreground" : m.direction === "down" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="flex flex-col gap-1.5 p-4 sm:p-5">
      <p className="text-[0.64rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">{m.label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="font-serif text-3xl leading-none tracking-tight">{format(m.key, m.predicted)}</p>
        <Sparkline weeks={m.weeks} predicted={m.predicted} />
      </div>
      <p className={cn("flex items-center gap-1 text-xs", tone)}>
        <Arrow className="size-3.5" />
        {m.predicted === null
          ? "Not enough data yet"
          : m.direction === "steady"
            ? `About the same as this week (${format(m.key, m.current)})`
            : `${m.direction === "up" ? "Up" : "Down"} from ${format(m.key, m.current)} this week`}
      </p>
    </div>
  );
}

function toAiSummary(p: WeekPrediction): AiWeekSummary {
  const scale = (key: MetricKey, v: number | null) =>
    v === null ? null : key === "completion" || key === "habits" ? Math.round(v * 100) : Math.round(v * 10) / 10;
  const pct = (v: number) => Math.round(v * 100);
  return {
    metrics: p.metrics.map((m) => ({
      label: m.label,
      unit: m.key === "completion" || m.key === "habits" ? "percent" : UNIT[m.key],
      lastFourWeeks: m.weeks.map((v) => scale(m.key, v)),
      thisWeek: scale(m.key, m.current),
      predictedNextWeek: scale(m.key, m.predicted),
      direction: m.direction,
      confidence: m.confidence,
    })),
    strongestWeekday: p.bestDay && { weekday: p.bestDay.weekday, completionPercent: pct(p.bestDay.rate) },
    hardestWeekday: p.hardestDay && { weekday: p.hardestDay.weekday, completionPercent: pct(p.hardestDay.rate) },
    suggestedPlansPerDay: p.suggestedPlansPerDay,
    completionAfterGoodSleepPercent: p.sleepEffect && pct(p.sleepEffect.rested),
    completionAfterShortSleepPercent: p.sleepEffect && pct(p.sleepEffect.tired),
    slippingThreeWeeksRunning: p.risks,
  };
}

export function WeekPredictor({ history }: { history: ReviewDay[] }) {
  const p = useMemo(() => predictWeek(history), [history]);
  const confidence = p.metrics.some((m) => m.confidence === "high")
    ? "Solid estimate"
    : p.metrics.some((m) => m.confidence === "medium")
      ? "Fair estimate"
      : "Early estimate";

  const patterns: { icon: typeof Moon; text: string }[] = [];
  if (p.bestDay && p.hardestDay) {
    patterns.push({
      icon: CalendarHeart,
      text: `${p.bestDay.weekday}s are your strongest day (${Math.round(p.bestDay.rate * 100)}% done); ${p.hardestDay.weekday}s are the hardest (${Math.round(p.hardestDay.rate * 100)}%). Put the bigger things on ${p.bestDay.weekday}.`,
    });
  }
  if (p.sleepEffect) {
    patterns.push({
      icon: Moon,
      text: `After 7+ hours of sleep you finish ${Math.round(p.sleepEffect.rested * 100)}% of your plans, versus ${Math.round(p.sleepEffect.tired * 100)}% after less.`,
    });
  }
  if (p.suggestedPlansPerDay) {
    patterns.push({
      icon: Target,
      text: `Plan about ${p.suggestedPlansPerDay} thing${p.suggestedPlansPerDay === 1 ? "" : "s"} a day next week. That matches what you comfortably finish.`,
    });
  }
  for (const r of p.risks) {
    patterns.push({ icon: TriangleAlert, text: `${r} has slipped three weeks in a row. Worth a gentle look.` });
  }

  return (
    <section aria-label="Next week, predicted" className="ruled">
      <div className="space-y-3 p-5 sm:p-6">
        <SectionTitle
          icon={Sparkles}
          title="Next week, predicted"
          aside={
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[0.65rem] font-semibold text-secondary-foreground">
              {confidence}
            </span>
          }
        />
        {!p.enoughData ? (
          <p className="text-sm text-muted-foreground">
            Log plans, check-ins or sleep on a few more days and Dovie will start predicting next week: how much you&apos;re
            likely to get done, your habit rhythm, rest, focus and mood.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Estimated from your last four weeks. The solid line is what happened; the dashed step is next week.
          </p>
        )}
      </div>

      {p.enoughData && (
        // All six metrics always render so the 2- and 3-column grids stay full.
        <div className="ruled grid-cols-2 border-0 bg-border lg:grid-cols-3">
          {p.metrics.map((m) => (
            <MetricCell key={m.key} m={m} />
          ))}
        </div>
      )}

      {p.enoughData && patterns.length > 0 && (
        <ul className="divide-y">
          {patterns.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3 px-5 py-3 text-sm sm:px-6">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              {text}
            </li>
          ))}
        </ul>
      )}

      {p.enoughData && (
        <div className="p-5 sm:p-6">
          <AskDovie
            endpoint="/api/insights/weekly"
            payload={() => toAiSummary(p)}
            label="Ask Dovie about next week"
            disclosure="Sends these weekly numbers and weekday names to an AI service (Google Gemini or Anthropic Claude) for a short look ahead. Task titles, notes and journal entries are never sent."
          />
          <p className="mt-3 text-[0.7rem] text-muted-foreground">Gentle estimates from your own logs, not promises.</p>
        </div>
      )}
    </section>
  );
}
