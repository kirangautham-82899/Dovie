"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Leaf, Lightbulb } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { analyseMoodMoney, MIN_DAYS } from "@/features/money/mood-money";
import { forecastMoney } from "@/features/money/forecast";
import { useFeelings, useMoney } from "@/features/money/use-money";
import { useTasks } from "@/features/tasks/use-tasks";
import { pickDailyInsight, pickPlanInsight, type DailyInsight } from "./daily-insight";

const noop = () => {};
const whole = (paise: number) => formatPaise(Math.round(paise / 100) * 100);

const TONE: Record<DailyInsight["tone"], string> = {
  watch: "bg-butter text-butter-foreground",
  win: "bg-mint text-mint-foreground",
  gentle: "bg-secondary text-secondary-foreground",
  learning: "bg-sky text-sky-foreground",
};

/**
 * "Dovie noticed": the one most useful thing the app has worked out today,
 * from the user's own numbers. Worked out on the device; nothing is sent anywhere.
 */
export function DailyInsightCard({ today, wantsMoney }: { today: string; wantsMoney: boolean }) {
  const money = useMoney(today, noop).query.data;
  const feelings = useFeelings(today).data;
  const tasks = useTasks(today, noop).query.data;

  const moneyInsight = useMemo(() => {
    if (!money || !feelings) return null;
    const mm = analyseMoodMoney({ today, feelings, expenses: [...money.history, ...money.expenses] });
    const f = forecastMoney({
      today,
      month: money.expenses,
      history: money.history,
      bills: money.bills,
      budgets: money.budgets,
      goals: money.goals,
    });
    const hasMoneyData = money.expenses.length + money.history.length + money.budgets.length + money.bills.length > 0;
    // Someone who skipped Money and has never used it isn't shown money talk.
    if (!wantsMoney && !hasMoneyData) return null;
    return pickDailyInsight({
      moodMoney: mm,
      categories: f.categories,
      minDays: MIN_DAYS,
      fmt: whole,
      pace: { spent: f.spentSoFar, projected: f.projected, daysLeft: f.daysLeft },
      hasMoneyData,
    });
  }, [today, money, feelings, wantsMoney]);

  // Money findings lead, but a "still learning" nudge gives way to a real
  // observation about today's plans, and the plans speak for anyone without money data.
  const planInsight = useMemo(() => (tasks ? pickPlanInsight(tasks) : null), [tasks]);
  const insight = moneyInsight && moneyInsight.tone !== "learning" ? moneyInsight : (planInsight ?? moneyInsight);

  if (!insight) return null;
  const Icon = insight.tone === "win" ? Leaf : Lightbulb;

  return (
    <section aria-label="Dovie noticed" className={cn("sticky-note flex items-start gap-3 p-4 sm:p-5", TONE[insight.tone])}>
      <Icon className="mt-1 size-5 shrink-0 opacity-80" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-hand text-lg leading-none opacity-75">Dovie noticed</p>
        <h2 className="font-serif text-xl leading-snug tracking-tight text-foreground sm:text-2xl">{insight.title}</h2>
        <p className="text-sm leading-relaxed text-foreground/80">{insight.body}</p>
        {insight.progress && (
          <div className="pt-1">
            <div className="h-2 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(insight.progress.done / insight.progress.total) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-foreground/70">
              {insight.progress.done} of {insight.progress.total} days so far
            </p>
          </div>
        )}
        {insight.href && insight.linkLabel && (
          <Link
            href={insight.href}
            className="inline-flex pt-0.5 text-sm font-semibold text-foreground underline underline-offset-4 hover:no-underline"
          >
            {insight.linkLabel} →
          </Link>
        )}
      </div>
    </section>
  );
}
