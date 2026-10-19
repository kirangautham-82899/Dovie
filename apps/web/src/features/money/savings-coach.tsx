"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Loader2, PiggyBank, RotateCcw, Sparkles, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChoicePills } from "@/components/field";
import { ErrorNote, SectionTitle } from "@/components/page-header";
import { createStore } from "@/lib/local-store";
import { formatPaise, rupeesToPaise } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { SavingsPlan } from "@/lib/savings-plan";
import type { SavingsSummary } from "@/app/api/insights/savings/route";
import type { MoneyState } from "./api";
import { forecastMoney, type MoneyForecast } from "./forecast";
import { analyseSavings, monthlyCost, type SavingsAnalysis, type SavingsTip } from "./savings";

type Focus = SavingsSummary["focus"];

// Income and choices stay on this device. Income is only sent, as a number,
// when the coach is asked.
type Prefs = { income: string; focus: Focus; tried: string[] };
const prefsStore = createStore<Prefs>(() => ({ income: "", focus: "balanced", tried: [] }), "dovie-savings");
const SERVER_PREFS: Prefs = { income: "", focus: "balanced", tried: [] };
const usePrefs = () => useSyncExternalStore(prefsStore.subscribe, prefsStore.get, () => SERVER_PREFS);
const setPrefs = (patch: Partial<Prefs>) => prefsStore.set({ ...prefsStore.get(), ...patch });

const FOCUS = [
  { value: "balanced", label: "Balanced" },
  { value: "quick-wins", label: "Quick wins" },
  { value: "big-savings", label: "Biggest savings" },
] as const;

const DIFFICULTY: Record<SavingsTip["difficulty"], { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-mint text-mint-foreground" },
  medium: { label: "Medium", className: "bg-butter text-butter-foreground" },
  stretch: { label: "Stretch", className: "bg-lilac text-lilac-foreground" },
};

const rupees = (paise: number) => Math.round(paise) / 100;

function toSummary(data: MoneyState, f: MoneyForecast, a: SavingsAnalysis, incomePaise: number | null, focus: Focus, today: string): SavingsSummary {
  return {
    month: formatDate(today, { month: "long", year: "numeric" }),
    dayOfMonth: f.dayOfMonth,
    daysInMonth: f.daysInMonth,
    monthlyIncome: incomePaise === null ? null : rupees(incomePaise),
    spentSoFar: rupees(f.spentSoFar),
    projectedThisMonth: rupees(f.projected),
    usualMonthlySpend: a.avgMonthly === null ? null : rupees(a.avgMonthly),
    weekendShareOfSpending: Math.round(a.weekendShare * 100) / 100,
    busiestWeekday: a.busiestWeekday,
    categories: a.categories.slice(0, 15).map((c) => ({
      category: c.category,
      thisMonth: rupees(c.thisMonth),
      projected: rupees(c.projected),
      usualMonthly: c.avgMonthly === null ? null : rupees(c.avgMonthly),
      budget: c.budget === null ? null : rupees(c.budget),
      purchases: c.transactions,
      smallPurchases: c.smallPurchases,
      smallPurchasesTotal: rupees(c.smallPurchasesTotal),
    })),
    recurringBills: a.recurring.slice(0, 25).map((b) => ({
      name: b.title.slice(0, 80),
      monthlyCost: rupees(monthlyCost(b)),
      repeats: b.recurrence as "weekly" | "monthly" | "yearly",
    })),
    savingsGoals: data.goals.slice(0, 10).map((g) => ({
      title: g.title.slice(0, 60),
      remaining: rupees(Math.max(0, g.target_paise - g.saved_paise)),
      targetDate: g.target_date,
    })),
    focus,
  };
}

async function askCoach(payload: SavingsSummary): Promise<SavingsPlan> {
  const res = await fetch("/api/insights/savings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "Dovie couldn't answer just now.");
  const plan = SavingsPlan.safeParse(body);
  if (!plan.success) throw new Error("Dovie's answer came back garbled. Please try again.");
  return plan.data;
}

type ShownTip = SavingsTip;

export function SavingsCoach({ today, data }: { today: string; data: MoneyState }) {
  const prefs = usePrefs();
  const incomePaise = prefs.income ? rupeesToPaise(prefs.income) : null;
  const f = useMemo(
    () =>
      forecastMoney({ today, month: data.expenses, history: data.history, bills: data.bills, budgets: data.budgets, goals: data.goals }),
    [today, data],
  );
  const a = useMemo(() => analyseSavings(data, f, incomePaise), [data, f, incomePaise]);
  const coach = useMutation({ mutationFn: (payload: SavingsSummary) => askCoach(payload) });
  const plan = coach.data;
  const hasData = f.spentSoFar > 0 || data.history.length > 0;

  const tips: ShownTip[] = plan
    ? plan.tips.map((t, i) => ({ ...t, id: `ai-${i}-${t.title}`, monthlySaving: Math.max(0, Math.round(t.monthlySaving)) * 100 }))
    : a.tips;
  const potential = plan ? Math.max(0, Math.round(plan.monthlyPotential)) * 100 : a.potential;
  const committed = tips.filter((t) => prefs.tried.includes(t.title)).reduce((s, t) => s + t.monthlySaving, 0);

  const toggleTried = (title: string) =>
    setPrefs({ tried: prefs.tried.includes(title) ? prefs.tried.filter((t) => t !== title) : [...prefs.tried, title].slice(-40) });

  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle
        icon={PiggyBank}
        title="Savings coach"
        aside={
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[0.65rem] font-semibold text-secondary-foreground">
            <Sparkles className="size-3" /> AI
          </span>
        }
      />

      {!hasData ? (
        <p className="text-sm text-muted-foreground">
          Log a week or two of expenses and the coach will find where your money quietly slips away, and how much you could keep each month.
        </p>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
            <div className="space-y-4">
              <div className="rounded-3xl bg-blush p-4">
                <p className="text-xs text-muted-foreground">{plan ? "Your personal plan could save" : "Dovie spotted room to save"}</p>
                <p className="font-serif text-4xl leading-none tracking-tight">
                  {formatPaise(potential)}
                  <span className="ml-1 font-sans text-sm text-muted-foreground">/ month</span>
                </p>
                <p className="mt-2 text-sm">
                  That&apos;s about <strong>{formatPaise(potential * 12)}</strong> a year.
                </p>
                {committed > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-mint-foreground">
                    <Check className="size-4" /> You&apos;re trying {formatPaise(committed)} a month of these.
                  </p>
                )}
              </div>

              {incomePaise && a.savingsTarget !== null && a.projectedLeftover !== null && (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Left this month after spending &amp; bills</span>
                    <span>20% goal {formatPaise(a.savingsTarget)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", a.projectedLeftover >= a.savingsTarget ? "bg-chart-5" : "bg-primary")}
                      style={{ width: `${Math.min(100, Math.max(2, (Math.max(0, a.projectedLeftover) / a.savingsTarget) * 100))}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.projectedLeftover >= a.savingsTarget
                      ? `On pace to keep ${formatPaise(a.projectedLeftover)}. Lovely.`
                      : a.projectedLeftover > 0
                        ? `On pace to keep ${formatPaise(a.projectedLeftover)}, ${formatPaise(a.savingsTarget - a.projectedLeftover)} short of 20%.`
                        : "Spending is on pace to pass this month's income."}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-semibold">
                  Monthly income (optional)
                  <Input
                    className="mt-1.5"
                    inputMode="decimal"
                    placeholder="e.g. 45,000"
                    value={prefs.income}
                    onChange={(e) => setPrefs({ income: e.target.value })}
                    aria-invalid={!!prefs.income && incomePaise === null}
                  />
                  <span className="mt-1 block font-normal text-muted-foreground">Stays on this device. Helps aim for saving 20%.</span>
                </label>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">What kind of plan?</p>
                  <ChoicePills label="Plan focus" options={FOCUS} value={prefs.focus} onChange={(focus) => setPrefs({ focus })} />
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={coach.isPending}
                  onClick={() => coach.mutate(toSummary(data, f, a, incomePaise, prefs.focus, today))}
                >
                  {coach.isPending ? <Loader2 className="animate-spin" /> : plan ? <RotateCcw /> : <Sparkles />}
                  {coach.isPending ? "Dovie is looking for savings…" : plan ? "Build a fresh plan" : "Build my savings plan"}
                </Button>
                <p className="text-[0.7rem] text-muted-foreground">
                  Sends category totals, bill names and amounts, goal titles and your income figure to the AI. Expense notes and
                  journal entries are never sent.
                </p>
                {coach.isError && <ErrorNote message={coach.error.message} onRetry={() => coach.mutate(toSummary(data, f, a, incomePaise, prefs.focus, today))} />}
              </div>
            </div>

            <div className="space-y-3">
              {plan && <p className="animate-rise font-serif text-xl leading-snug">{plan.headline}</p>}
              {!plan && (
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Quick read from your numbers
                </p>
              )}
              {tips.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing stands out yet; your spending looks steady. Ask the coach for ideas tailored to you.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {tips.map((t, i) => {
                    const tried = prefs.tried.includes(t.title);
                    return (
                      <li
                        key={t.id}
                        className={cn("animate-rise rounded-2xl border p-3.5 transition-colors", tried ? "border-chart-5/50 bg-mint/40" : "bg-background")}
                        style={{ animationDelay: `${i * 70}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={tried}
                            aria-label={`I'll try: ${t.title}`}
                            onClick={() => toggleTried(t.title)}
                            className={cn(
                              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                              tried ? "border-chart-5 bg-chart-5 text-white" : "hover:border-primary",
                            )}
                          >
                            {tried && <Check className="size-3.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                              <p className="font-semibold">{t.title}</p>
                              <p className="font-serif text-lg text-chart-5 tabular-nums">+{formatPaise(t.monthlySaving)}/mo</p>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">{t.detail}</p>
                            <div className="mt-2 flex gap-1.5 text-[0.65rem] font-semibold">
                              <span className={cn("rounded-full px-2 py-0.5", DIFFICULTY[t.difficulty].className)}>{DIFFICULTY[t.difficulty].label}</span>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{t.category}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {plan && (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-2xl bg-butter p-3.5 text-butter-foreground">
                    <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                      <Trophy className="size-3.5" /> 7-day challenge
                    </p>
                    <p className="mt-1 font-semibold">{plan.challenge.title}</p>
                    <p className="text-sm opacity-90">{plan.challenge.detail}</p>
                  </div>
                  {plan.goalNote && (
                    <div className="rounded-2xl bg-lilac p-3.5 text-lilac-foreground">
                      <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                        <Target className="size-3.5" /> Your goals
                      </p>
                      <p className="mt-1 text-sm">{plan.goalNote}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
