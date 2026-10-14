import { z } from "zod";
import { insightResponse } from "@/lib/ai-insight";

// Next-week predictions are computed in the browser; this route turns them
// into a short read. It receives numbers and weekday names only - never task
// titles, notes or journal text.

const value = z.number().finite().min(0).max(100_000).nullable();
const Metric = z.object({
  label: z.string().max(30),
  unit: z.string().max(20),
  lastFourWeeks: z.array(value).max(4),
  thisWeek: value,
  predictedNextWeek: value,
  direction: z.enum(["up", "down", "steady"]),
  confidence: z.enum(["low", "medium", "high"]),
});

const WeekSummary = z.object({
  metrics: z.array(Metric).max(6),
  strongestWeekday: z.object({ weekday: z.string().max(10), completionPercent: z.number().min(0).max(100) }).nullable(),
  hardestWeekday: z.object({ weekday: z.string().max(10), completionPercent: z.number().min(0).max(100) }).nullable(),
  suggestedPlansPerDay: z.number().int().min(1).max(50).nullable(),
  completionAfterGoodSleepPercent: z.number().min(0).max(100).nullable(),
  completionAfterShortSleepPercent: z.number().min(0).max(100).nullable(),
  slippingThreeWeeksRunning: z.array(z.string().max(30)).max(6),
});

export type WeekSummary = z.infer<typeof WeekSummary>;

const SYSTEM = `You are Dovie's weekly companion inside a gentle personal planner. You receive the user's last four weeks of numbers (plans completed, habit rhythm, sleep, focus, movement, mood) and a simple statistical prediction for next week, plus weekday patterns.

Give a short, warm look ahead: what next week is likely to feel like, which pattern is worth leaning on (for example a strong weekday or the effect of sleep), and what might be slipping. Treat predictions as gentle estimates, not promises.`;

export function POST(request: Request) {
  return insightResponse(request, WeekSummary, SYSTEM);
}
