// Finds realistic ways to spend less, from the user's own entries. Runs in the
// browser; the AI coach only receives the totals this produces.
// All amounts are paise.

import type { Bill, Expense, MoneyState } from "./api";
import type { MoneyForecast } from "./forecast";

/** A purchase this small, repeated often, is easy to miss. */
export const SMALL_PURCHASE_PAISE = 300_00;

export type CategoryHabit = {
  category: string;
  thisMonth: number;
  projected: number;
  /** Average per month over the previous ~3 months, or null with no history. */
  avgMonthly: number | null;
  budget: number | null;
  transactions: number;
  smallPurchases: number;
  smallPurchasesTotal: number;
};

export type SavingsTip = {
  id: string;
  title: string;
  detail: string;
  category: string;
  monthlySaving: number;
  difficulty: "easy" | "medium" | "stretch";
};

export type SavingsAnalysis = {
  categories: CategoryHabit[];
  avgMonthly: number | null;
  monthlyBills: number;
  recurring: Bill[];
  weekendShare: number;
  busiestWeekday: string | null;
  /** 20% of income, if income is known. */
  savingsTarget: number | null;
  /** What's left this month after projected spending, if income is known. */
  projectedLeftover: number | null;
  tips: SavingsTip[];
  potential: number;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Monthly cost of a recurring bill. */
export function monthlyCost(b: Bill): number {
  const a = b.amount_paise ?? 0;
  if (b.recurrence === "weekly") return Math.round((a * 52) / 12);
  if (b.recurrence === "yearly") return Math.round(a / 12);
  if (b.recurrence === "monthly") return a;
  return 0;
}

function rupeesRound(paise: number, step = 50) {
  // Tips are estimates, so round to a friendly number of rupees.
  return Math.max(0, Math.round(paise / 100 / step) * step * 100);
}

export function analyseSavings(data: MoneyState, f: MoneyForecast, incomePaise: number | null): SavingsAnalysis {
  const historyMonths = new Set(data.history.map((e) => e.spent_on.slice(0, 7))).size;
  const avgMonthly = historyMonths > 0 ? data.history.reduce((s, e) => s + e.amount_paise, 0) / historyMonths : null;

  const byCat = new Map<string, Expense[]>();
  for (const e of data.expenses) byCat.set(e.category, [...(byCat.get(e.category) ?? []), e]);
  const histByCat = new Map<string, number>();
  for (const e of data.history) histByCat.set(e.category, (histByCat.get(e.category) ?? 0) + e.amount_paise);

  const categories: CategoryHabit[] = [...new Set([...byCat.keys(), ...histByCat.keys()])]
    .map((category) => {
      const list = byCat.get(category) ?? [];
      const small = list.filter((e) => e.amount_paise <= SMALL_PURCHASE_PAISE);
      const fc = f.categories.find((c) => c.category === category);
      return {
        category,
        thisMonth: list.reduce((s, e) => s + e.amount_paise, 0),
        projected: fc?.projected ?? 0,
        avgMonthly: historyMonths > 0 ? (histByCat.get(category) ?? 0) / historyMonths : null,
        budget: fc?.limit ?? data.budgets.find((b) => b.category === category)?.monthly_limit_paise ?? null,
        transactions: list.length,
        smallPurchases: small.length,
        smallPurchasesTotal: small.reduce((s, e) => s + e.amount_paise, 0),
      };
    })
    .sort((a, b) => b.projected - a.projected);

  const recurring = data.bills.filter((b) => b.recurrence !== "once");
  const monthlyBills = recurring.reduce((s, b) => s + monthlyCost(b), 0);

  const byDay = new Array(7).fill(0) as number[];
  for (const e of [...data.expenses, ...data.history]) byDay[new Date(`${e.spent_on}T00:00:00Z`).getUTCDay()] += e.amount_paise;
  const all = byDay.reduce((s, v) => s + v, 0);
  const weekendShare = all > 0 ? (byDay[0] + byDay[6]) / all : 0;
  const busiest = all > 0 ? byDay.indexOf(Math.max(...byDay)) : -1;

  const savingsTarget = incomePaise ? Math.round(incomePaise * 0.2) : null;
  const projectedLeftover = incomePaise ? incomePaise - f.projected - f.billsDueThisMonth : null;

  // ---------- rule-based tips ----------
  const tips: SavingsTip[] = [];
  const fmt = (p: number) => `₹${Math.round(p / 100).toLocaleString("en-IN")}`;

  for (const c of categories) {
    if (c.avgMonthly && c.avgMonthly > 0 && c.projected > c.avgMonthly * 1.15 && c.projected - c.avgMonthly >= 200_00) {
      tips.push({
        id: `above-${c.category}`,
        title: `Ease ${c.category} back to usual`,
        detail: `${c.category} is heading for ${fmt(c.projected)} this month against your usual ${fmt(c.avgMonthly)}. Pausing here for the rest of the month closes most of that gap.`,
        category: c.category,
        monthlySaving: rupeesRound(c.projected - c.avgMonthly),
        difficulty: "medium",
      });
    }
    if (c.smallPurchases >= 6 && c.smallPurchasesTotal >= 500_00) {
      tips.push({
        id: `small-${c.category}`,
        title: `Batch the small ${c.category} buys`,
        detail: `${c.smallPurchases} small ${c.category} purchases have added up to ${fmt(c.smallPurchasesTotal)} so far. Planning them once a week usually trims about a third.`,
        category: c.category,
        monthlySaving: rupeesRound((c.smallPurchasesTotal / Math.max(1, f.dayOfMonth)) * f.daysInMonth * 0.3),
        difficulty: "easy",
      });
    }
    if (c.budget && c.projected > c.budget) {
      tips.push({
        id: `budget-${c.category}`,
        title: `Hold ${c.category} to its budget`,
        detail: `At this pace ${c.category} lands at ${fmt(c.projected)}, over its ${fmt(c.budget)} budget. That leaves about ${fmt(Math.max(0, c.budget - c.thisMonth) / Math.max(1, f.daysLeft))} a day for it.`,
        category: c.category,
        monthlySaving: rupeesRound(c.projected - c.budget),
        difficulty: "medium",
      });
    }
  }

  if (recurring.filter((b) => b.recurrence === "monthly").length >= 2 && monthlyBills >= 500_00) {
    tips.push({
      id: "subscriptions",
      title: "Review your repeat bills",
      detail: `Your recurring bills come to ${fmt(monthlyBills)} a month. Cancelling or downgrading one you rarely use is often the easiest saving there is.`,
      category: "Bills",
      monthlySaving: rupeesRound(monthlyBills * 0.15),
      difficulty: "easy",
    });
  }

  if (weekendShare > 0.45 && f.projected > 0) {
    tips.push({
      id: "weekends",
      title: "Plan one low-spend weekend",
      detail: `${Math.round(weekendShare * 100)}% of your spending happens on weekends. One planned, low-cost weekend a month makes a real dent.`,
      category: "General",
      monthlySaving: rupeesRound((f.projected * weekendShare) / 8),
      difficulty: "easy",
    });
  }

  if (savingsTarget && projectedLeftover !== null && projectedLeftover < savingsTarget) {
    tips.push({
      id: "pay-yourself-first",
      title: "Move savings out on payday",
      detail: `Setting aside ${fmt(savingsTarget)} (20% of income) the day money arrives makes it the first thing paid, not the last.`,
      category: "General",
      monthlySaving: rupeesRound(Math.max(0, savingsTarget - Math.max(0, projectedLeftover))),
      difficulty: "stretch",
    });
  }

  // Keep the biggest saving per category so tips don't double count.
  const best = new Map<string, SavingsTip>();
  for (const t of tips.filter((t) => t.monthlySaving > 0)) {
    const key = t.category === "General" ? t.id : t.category;
    if (!best.has(key) || best.get(key)!.monthlySaving < t.monthlySaving) best.set(key, t);
  }
  const final = [...best.values()].sort((a, b) => b.monthlySaving - a.monthlySaving).slice(0, 5);

  return {
    categories,
    avgMonthly,
    monthlyBills,
    recurring,
    weekendShare,
    busiestWeekday: busiest >= 0 ? WEEKDAYS[busiest] : null,
    savingsTarget,
    projectedLeftover,
    tips: final,
    potential: final.reduce((s, t) => s + t.monthlySaving, 0),
  };
}

/**
 * What this month's income is likely to be: what has come in so far, or the
 * usual month if more is normally on its way (salary may not have landed yet).
 * Null when no income has ever been logged.
 */
export function expectedIncome(data: Pick<MoneyState, "income" | "incomeHistory">): number | null {
  const soFar = data.income.reduce((s, i) => s + i.amount_paise, 0);
  const months = new Set(data.incomeHistory.map((i) => i.received_on.slice(0, 7))).size;
  const usual = months > 0 ? data.incomeHistory.reduce((s, i) => s + i.amount_paise, 0) / months : 0;
  const best = Math.max(soFar, Math.round(usual));
  return best > 0 ? best : null;
}
