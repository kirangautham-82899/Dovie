"use client";

import { ForecastChart } from "@/components/charts";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/page-header";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ForecastSummary } from "@/app/api/insights/money/route";
import { AskDovie } from "@/components/ask-dovie";
import type { MoneyState } from "./api";
import type { MoneyForecast } from "./forecast";

/** Labels for forecast statuses, also used by the budget and goal lists. */
export const FORECAST_STATUS = {
  over: { label: "Likely over", className: "bg-destructive/10 text-destructive" },
  tight: { label: "Getting close", className: "bg-[hsl(40_90%_92%)] text-[hsl(32_60%_32%)] dark:bg-[hsl(38_30%_20%)] dark:text-[hsl(44_85%_80%)]" },
  "on-track": { label: "On track", className: "bg-mint text-mint-foreground" },
  "no-budget": { label: "No budget", className: "bg-muted text-muted-foreground" },
  done: { label: "Reached", className: "bg-mint text-mint-foreground" },
  behind: { label: "Behind", className: "bg-[hsl(40_90%_92%)] text-[hsl(32_60%_32%)] dark:bg-[hsl(38_30%_20%)] dark:text-[hsl(44_85%_80%)]" },
  "no-data": { label: "Just started", className: "bg-muted text-muted-foreground" },
} satisfies Record<string, { label: string; className: string }>;

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

export function MoneyForecastCard({
  today,
  data,
  forecast: f,
  incomePaise,
}: {
  today: string;
  data: MoneyState;
  forecast: MoneyForecast;
  /** The month's expected income, when the user logs income. */
  incomePaise: number | null;
}) {
  const totalBudget = data.budgets.reduce((s, b) => s + b.monthly_limit_paise, 0);
  const delta = f.lastMonthTotal ? (f.projected - f.lastMonthTotal) / f.lastMonthTotal : null;
  const hasData = f.spentSoFar > 0 || data.history.length > 0;
  const keep = incomePaise === null ? null : incomePaise - f.projected - f.billsDueThisMonth;

  return (
    <Card className="p-4 sm:p-5">
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
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  On pace to spend by {formatDate(f.monthEnd, { day: "numeric", month: "short" })}
                </p>
                <p className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">{approx(f.projected)}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Likely between {approx(f.low)} and {approx(f.high)}
                </p>
              </div>
              {keep !== null && (
                <p className={cn("text-sm font-semibold", keep >= 0 ? "text-mint-foreground" : "text-destructive")}>
                  {keep >= 0
                    ? `On pace to keep about ${approx(keep)} of your ${approx(incomePaise as number)} income.`
                    : `On pace to spend ${approx(-keep)} more than you earn this month.`}
                </p>
              )}
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

            <div className="h-44 w-full lg:h-52" aria-hidden>
              <ForecastChart series={f.series} totalBudget={totalBudget} format={approx} />
            </div>
          </div>

          <div className="border-t pt-3">
            <AskDovie
              endpoint="/api/insights/money"
              payload={() => toSummary(f, today, data)}
              label="Ask Dovie what this means"
              disclosure="Sends these totals, category names and goal titles to Claude for a short read. Expense notes and journal entries are never sent."
            />
          </div>
        </>
      )}
    </Card>
  );
}
