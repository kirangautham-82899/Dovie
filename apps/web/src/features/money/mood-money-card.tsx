"use client";

import { useMemo } from "react";
import Link from "next/link";
import { HeartPulse, Leaf } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/page-header";
import { MOODS } from "@/features/checkin/mood";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MoneyState } from "./api";
import { analyseMoodMoney, MIN_DAYS, type Insight, type Signal } from "./mood-money";
import { useFeelings } from "./use-money";

const whole = (paise: number) => formatPaise(Math.round(paise / 100) * 100);

const LOW_DAY: Record<Signal, string> = {
  mood: "low-mood days",
  energy: "low-energy days",
  sleep: "nights under 6 hours of sleep",
};

const TIP: Record<Signal, string> = {
  mood: "On a low day, try a 10-minute pause before buying. If you still want it after, it's yours.",
  energy: "Keep one easy meal ready for tired evenings, so low energy doesn't turn into delivery.",
  sleep: "After a short night, put off non-urgent buys until tomorrow, when you've rested.",
};

const CALM: Record<Signal, string> = {
  mood: "Low moods don't push your spending up. That's a real strength.",
  energy: "Tired days don't cost you more. Nicely steady.",
  sleep: "Short nights don't change your spending. Steady hands.",
};

function times(ratio: number) {
  return Number.isFinite(ratio) ? `${ratio.toFixed(1)}×` : "much";
}

function Headline({ insight }: { insight: Insight }) {
  return (
    <div className="space-y-2">
      <p className="font-serif text-2xl leading-snug tracking-tight">
        On {LOW_DAY[insight.signal]} you spend <span className="highlighter">{times(insight.ratio)} more</span>
        {insight.topCategory && <>, mostly on {insight.topCategory}</>}.
      </p>
      <p className="text-sm text-muted-foreground">
        About {whole(insight.lowAvg)} a day, against {whole(insight.restAvg)} on other days. That pattern costs roughly{" "}
        <strong className="text-foreground">{whole(insight.monthlyCost)} a month</strong>.
      </p>
      <p className="border-l-2 border-primary/40 pl-3 font-hand text-xl leading-snug">{TIP[insight.signal]}</p>
    </div>
  );
}

/**
 * Lines up the user's evening check-ins with their spending. Worked out on the
 * device from data Dovie already has; nothing extra is sent anywhere.
 */
export function MoodMoneyCard({ today, data }: { today: string; data: MoneyState }) {
  const feelings = useFeelings(today);
  const mm = useMemo(
    () => analyseMoodMoney({ today, feelings: feelings.data ?? [], expenses: [...data.history, ...data.expenses] }),
    [today, feelings.data, data],
  );

  if (feelings.isPending || feelings.isError) return null;

  const [top, ...more] = mm.insights;
  const maxBar = Math.max(1, ...mm.bars.map((b) => b.avg));
  // A same-day heads-up when today already feels low and that usually costs more.
  const lowToday = mm.insights.find(
    (i) =>
      (i.signal === "mood" && (mm.today?.mood ?? 9) <= 2) ||
      (i.signal === "energy" && (mm.today?.energy ?? 9) <= 2) ||
      (i.signal === "sleep" && (mm.today?.sleep ?? 99) < 6),
  );

  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle
        icon={HeartPulse}
        title="Mood × Money"
        aside={<span className="text-[0.7rem] text-muted-foreground">from {mm.days} check-in days</span>}
      />

      {lowToday && (
        <p className="rounded-xl bg-butter px-3 py-2 text-sm text-butter-foreground">
          Today looks like one of your {LOW_DAY[lowToday.signal]}. Those usually cost about{" "}
          {whole(lowToday.lowAvg - lowToday.restAvg)} extra, so go gently.
        </p>
      )}

      {!mm.ready ? (
        <div className="space-y-2">
          <p className="text-sm">
            Dovie is learning how your mood and money move together. Check in each evening on{" "}
            <Link href="/today" className="font-semibold text-primary underline-offset-4 hover:underline">
              Today
            </Link>{" "}
            and keep adding expenses.
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${(mm.days / MIN_DAYS) * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {mm.days} of {MIN_DAYS} days so far
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            {top ? (
              <Headline insight={top} />
            ) : (
              <p className="font-serif text-2xl leading-snug tracking-tight">
                Your spending stays steady whatever the day feels like.
              </p>
            )}
            {more.map((i) => (
              <p key={i.signal} className="text-sm text-muted-foreground">
                Also: on {LOW_DAY[i.signal]} you spend {times(i.ratio)} more
                {i.topCategory && ` (mostly ${i.topCategory})`}, about {whole(i.monthlyCost)} a month.
              </p>
            ))}
            {mm.calm.map((s) => (
              <p key={s} className="flex items-start gap-1.5 text-sm text-mint-foreground">
                <Leaf className="mt-0.5 size-4 shrink-0" /> {CALM[s]}
              </p>
            ))}
          </div>

          <div>
            <p className="mb-2 text-[0.65rem] font-bold tracking-wider text-muted-foreground uppercase">Spend per day, by mood</p>
            <ul className="space-y-1.5 text-sm">
              {mm.bars.map((b) => (
                <li key={b.mood} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs text-muted-foreground">{MOODS[b.mood - 1].label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className={cn("h-full rounded-full", b.mood <= 2 ? "bg-chart-1" : "bg-primary/50")}
                      style={{ width: `${b.days ? Math.max(3, (b.avg / maxBar) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs tabular-nums">
                    {b.days ? whole(b.avg) : <span className="text-muted-foreground">no days</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <p className="text-[0.7rem] text-muted-foreground">
        Worked out on your device from your own check-ins and expenses. It shows patterns, not causes.
      </p>
    </Card>
  );
}
