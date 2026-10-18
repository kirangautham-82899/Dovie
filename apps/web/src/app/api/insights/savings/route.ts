import { z } from "zod";
import { insightResponse } from "@/lib/ai-insight";
import { SavingsPlan } from "@/lib/savings-plan";

// The savings coach. The browser sends spending totals per category, bill
// names and amounts, savings goal titles and (optionally) a monthly income the
// user typed in. Never expense notes or journal text.

const rupees = z.number().finite().min(0).max(1e9);

const SavingsSummary = z.object({
  month: z.string().max(30),
  dayOfMonth: z.number().int().min(1).max(31),
  daysInMonth: z.number().int().min(28).max(31),
  monthlyIncome: rupees.nullable(),
  spentSoFar: rupees,
  projectedThisMonth: rupees,
  usualMonthlySpend: rupees.nullable(),
  weekendShareOfSpending: z.number().min(0).max(1),
  busiestWeekday: z.string().max(12).nullable(),
  categories: z
    .array(
      z.object({
        category: z.string().max(30),
        thisMonth: rupees,
        projected: rupees,
        usualMonthly: rupees.nullable(),
        budget: rupees.nullable(),
        purchases: z.number().int().min(0).max(5000),
        smallPurchases: z.number().int().min(0).max(5000),
        smallPurchasesTotal: rupees,
      }),
    )
    .max(15),
  recurringBills: z
    .array(z.object({ name: z.string().max(80), monthlyCost: rupees, repeats: z.enum(["weekly", "monthly", "yearly"]) }))
    .max(25),
  savingsGoals: z
    .array(z.object({ title: z.string().max(60), remaining: rupees, targetDate: z.string().max(10).nullable() }))
    .max(10),
  focus: z.enum(["balanced", "quick-wins", "big-savings"]),
});

export type SavingsSummary = z.infer<typeof SavingsSummary>;

const SYSTEM = `You are Dovie's savings coach inside a gentle personal planner. You receive the user's own, manually entered spending for this month (in Indian rupees, write them like ₹1,250), how it compares with their usual months, their recurring bills, savings goals and, if they shared it, monthly income.

Find where they can realistically spend less without making life smaller. Look for: categories running above their usual, many small purchases that add up, recurring bills worth reviewing, weekend spending, and budgets at risk. Each saving must be believable for that category and month (usually 10-40% of that spending, never more than they spend). If income is given, compare it with spending and aim towards saving about 20% of it, kindly.

Match the requested focus: "quick-wins" means easy habits; "big-savings" means the largest amounts even if harder; "balanced" mixes both.

Suggestions are everyday and practical (cooking in, batching errands, pausing a subscription, a weekly cash limit, comparing a plan). Never suggest investments, stocks, crypto, loans, credit cards, insurance or tax moves.`;

export function POST(request: Request) {
  return insightResponse(request, SavingsSummary, SYSTEM, SavingsPlan);
}
