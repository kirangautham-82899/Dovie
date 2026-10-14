"use client";

import { useMemo } from "react";
import { ForecastChart } from "@/components/charts";
import { PiggyBank, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/page-header";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ForecastSummary } from "@/app/api/insights/money/route";
import { AskDovie } from "@/components/ask-dovie";
import type { MoneyState } from "./api";
import { forecastMoney, type MoneyForecast } from "./forecast";

const STATUS: Record<string, { label: string; className: string }> = {
  over: { label: "Likely over", className: "bg-destructive/10 text-destructive" },
  tight: { label: "Getting close", className: "bg-[hsl(40_90%_92%)] text-[hsl(32_60%_32%)] dark:bg-[hsl(38_30%_20%)] dark:text-[hsl(44_85%_80%)]" },
  "on-track": { label: "On track", className: "bg-mint text-mint-foreground" },
  "no-budget": { label: "No budget", className: "bg-muted text-muted-foreground" },
  done: { label: "Reached", className: "bg-mint text-mint-foreground" },
  behind: { label: "Behind", className: "bg-[hsl(40_90%_92%)] text-[hsl(32_60%_32%)] dark:bg-[hsl(38_30%_20%)] dark:text-[hsl(44_85%_80%)]" },
  "no-data": { label: "Just started", className: "bg-muted text-muted-foreground" },
};

const CONFIDENCE = {
  low: "Early estimate",
  medium: "Fair estimate",
  high: "Solid estimate",
} as const;

const rupees = (paise: number) => Math.round(paise) / 100;
/** Forecasts are estimates, so show whole rupees rather than false precision. */
const approx = (paise: number) => formatPaise(Math.round(paise / 100) * 100);

/** The numbers-only summary sent to the AI route. */
function toSummary(f: MoneyForecast, today: string, data: MoneyState): ForecastSummary {
  return {
    month: formatDate(today, { month: "long", year: "numeric" }),
    dayOfMonth: f.dayOfMonth,
    daysInMonth: f.daysInMonth,
    spentSoFar: rupees(f.spentSoFar),
    projected: rupees(f.projected),
    likelyRange: [rupees(f.low), rupees(f.high)],
    lastMonthTotal: f.lastMonthTotal === null ? null : rupees(f.lastMonthTotal),
    billsStillDueThisMonth: rupees(f.billsDueThisMonth),
    confidence: f.confidence,
    categories: f.categories.slice(0, 15).map((c) => ({
      category: c.category,
      spent: rupees(c.spent),
      projected: rupees(c.projected),
      budget: c.limit === null ? null : rupees(c.limit),
      status: c.status,
    })),
    savingsGoals: f.goals.slice(0, 10).map((g) => ({
      title: g.title.slice(0, 60),
      remaining: rupees(g.remaining),
      projectedFinish: g.eta,
      targetDate: data.goals.find((x) => x.id === g.id)?.target_date ?? null,
      neededPerMonth: g.neededPerMonth === null ? null : rupees(g.neededPerMonth),
      status: g.status,
    })),
  };
}

export function MoneyForecastCard({ today, data }: { today: string; data: MoneyState }) {
  const f = useMemo(
    () =>
      forecastMoney({
        today,
        month: data.expenses,
        history: data.history,
        bills: data.bills,
        budgets: data.budgets,
        goals: data.goals,
      }),
    [today, data],
  );

  const totalBudget = data.budgets.reduce((s, b) => s + b.monthly_limit_paise, 0);
  const delta = f.lastMonthTotal ? (f.projected - f.lastMonthTotal) / f.lastMonthTotal : null;
  const hasData = f.spentSoFar > 0 || data.history.length > 0;
  const budgeted = f.categories.filter((c) => c.status !== "no-budget");

  return (
    <Card className="lg:col-span-2">
      <SectionTitle
        icon={Sparkles}
        title="Month-end forecast"
        aside={
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[0.65rem] font-semibold text-secondary-foreground">
            {CONFIDENCE[f.confidence]}
          </span>
        }
      />

      {!hasData ? (
        <p className="text-sm text-muted-foreground">
          Add a few expenses and Dovie will start predicting where your month is heading, which budgets need care, and
          when your savings goals will land.
        </p>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  On pace to spend by {formatDate(f.monthEnd, { day: "numeric", month: "short" })}
                </p>
                <p className="font-serif text-5xl leading-none tracking-tight">{approx(f.projected)}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Likely between {approx(f.low)} and {approx(f.high)}
                </p>
              </div>
              <dl className="grid grid-cols-2 divide-x border-y text-sm">
                <div className="py-2.5 pr-3">
                  <dt className="text-[0.65rem] font-bold tracking-wider text-muted-foreground uppercase">Spent so far</dt>
                  <dd className="font-serif text-xl">{formatPaise(f.spentSoFar)}</dd>
                </div>
                <div className="py-2.5 pl-3">
                  <dt className="text-[0.65rem] font-bold tracking-wider text-muted-foreground uppercase">Bills still due</dt>
                  <dd className="font-serif text-xl">{formatPaise(f.billsDueThisMonth)}</dd>
                </div>
              </dl>
              {delta !== null && (
                <p className="flex items-center gap-1.5 text-sm">
                  {delta > 0 ? (
                    <TrendingUp className="size-4 text-destructive" />
                  ) : (
                    <TrendingDown className="size-4 text-mint-foreground" />
                  )}
                  {Math.abs(Math.round(delta * 100))}% {delta > 0 ? "more" : "less"} than last month (
                  {formatPaise(f.lastMonthTotal as number)})
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                About {approx(f.dailyPace)} a day for the {f.daysLeft} days left.
              </p>
            </div>

            <div className="h-52 w-full" aria-hidden>
              <ForecastChart series={f.series} totalBudget={totalBudget} format={approx} />
            </div>
          </div>

          {(budgeted.length > 0 || f.goals.length > 0) && (
            <div className="grid gap-6 border-t pt-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[0.65rem] font-bold tracking-wider text-muted-foreground uppercase">Budget outlook</p>
                {budgeted.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Set a budget to see which ones need care.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {budgeted.map((c) => (
                      <li key={c.category} className="flex items-center gap-2 py-2">
                        <span className="flex-1">{c.category}</span>
                        <span className="text-xs text-muted-foreground">
                          {approx(c.projected)} of {formatPaise(c.limit as number)}
                        </span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", STATUS[c.status].className)}>
                          {STATUS[c.status].label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-[0.65rem] font-bold tracking-wider text-muted-foreground uppercase">Savings goals</p>
                {f.goals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add a money goal to see when you&apos;ll reach it.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {f.goals.map((g) => (
                      <li key={g.id} className="flex items-center gap-2 py-2">
                        <PiggyBank className="size-4 shrink-0 text-chart-3" />
                        <span className="min-w-0 flex-1 truncate">{g.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {g.status === "done"
                            ? "Reached"
                            : g.eta
                              ? `~${formatDate(g.eta, { month: "short", year: "numeric" })}`
                              : "Add savings to estimate"}
                        </span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", STATUS[g.status].className)}>
                          {STATUS[g.status].label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <AskDovie
              endpoint="/api/insights/money"
              payload={() => toSummary(f, today, data)}
              label="Ask Dovie what this means"
              disclosure="Sends these totals, category names and goal titles to Claude for a short read. Expense notes and journal entries are never sent."
            />
          </div>
        </>
      )}

      <p className="text-[0.7rem] text-muted-foreground">
        Estimates from your own entries, for planning only. Not financial advice.
      </p>
    </Card>
  );
}
