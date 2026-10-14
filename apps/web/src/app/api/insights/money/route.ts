import { z } from "zod";
import { insightResponse } from "@/lib/ai-insight";

// The forecast is computed in the browser from the user's own entries; this
// route only turns it into a short, plain-language read. It receives numbers,
// category names and goal titles - never expense notes or journal text.

const Status = z.enum(["on-track", "tight", "over", "no-budget"]);
const GoalStatus = z.enum(["done", "on-track", "behind", "no-data"]);
const rupees = z.number().finite().min(0).max(1e9);

const ForecastSummary = z.object({
  month: z.string().max(30),
  dayOfMonth: z.number().int().min(1).max(31),
  daysInMonth: z.number().int().min(28).max(31),
  spentSoFar: rupees,
  projected: rupees,
  likelyRange: z.tuple([rupees, rupees]),
  lastMonthTotal: rupees.nullable(),
  billsStillDueThisMonth: rupees,
  confidence: z.enum(["low", "medium", "high"]),
  categories: z
    .array(z.object({ category: z.string().max(30), spent: rupees, projected: rupees, budget: rupees.nullable(), status: Status }))
    .max(15),
  savingsGoals: z
    .array(
      z.object({
        title: z.string().max(60),
        remaining: rupees,
        projectedFinish: z.string().max(10).nullable(),
        targetDate: z.string().max(10).nullable(),
        neededPerMonth: rupees.nullable(),
        status: GoalStatus,
      }),
    )
    .max(10),
});

export type ForecastSummary = z.infer<typeof ForecastSummary>;

const SYSTEM = `You are Dovie's money companion inside a gentle personal planner. You receive a month-end spending forecast computed from the user's own, manually entered expenses. Amounts are Indian rupees; write them like ₹4,250.

Give a short, warm read of where the month is heading: what stands out, which budgets need attention, and how savings goals are tracking. Don't assume income. Suggestions should be everyday and practical (meals, subscriptions, timing of purchases), never investment, tax, credit or loan advice.`;

export function POST(request: Request) {
  return insightResponse(request, ForecastSummary, SYSTEM);
}
