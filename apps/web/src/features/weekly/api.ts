import { createClient } from "@/lib/supabase/client";
import { fetchHabits } from "@/features/habits/api";
import { moodLabel } from "@/features/checkin/mood";
import { addDays, formatDate } from "@/lib/dates";

export type ReviewDay = {
  day: string;
  tasks_planned: number;
  tasks_done: number;
  habits_done: number;
  habits_total: number;
  mood: number | null;
  energy: number | null;
  sleep_hours: number | null;
  water_glasses: number | null;
  score: number | null;
  focus_minutes: number;
  movement_minutes: number;
  journaled: boolean;
};

export type WeekSummary = {
  days: ReviewDay[];
  /** The last 28 days, oldest first, for next-week predictions. */
  history: ReviewDay[];
  tasksDone: number;
  tasksPlanned: number;
  /** Share of possible habit check-offs that happened, 0..100, or null with no habits. */
  habitRhythm: number | null;
  averageSleep: number | null;
  averageMood: number | null;
  averageScore: number | null;
  focusMinutes: number;
  movementMinutes: number;
  waterGlasses: number;
  journalDays: number;
  checkinDays: number;
  habits: { id: string; title: string; daysDone: number }[];
  observations: string[];
  suggestions: string[];
};

function avg(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

const weekday = (d: string) => formatDate(d, { weekday: "long" });

/**
 * Rules-based notes from numbers only. Each rule needs a few days of data so
 * a single day never turns into a "pattern".
 */
function observe(days: ReviewDay[], s: Omit<WeekSummary, "observations" | "suggestions" | "habits" | "history">) {
  const observations: string[] = [];
  const suggestions: string[] = [];

  const best = days.reduce<ReviewDay | null>(
    (b, d) => (d.tasks_done > 0 && (!b || d.tasks_done > b.tasks_done) ? d : b),
    null,
  );
  if (best && best.tasks_done >= 2) observations.push(`${weekday(best.day)} was your fullest day, with ${best.tasks_done} plans done.`);

  const slept = days.filter((d) => d.sleep_hours !== null && d.tasks_planned > 0);
  if (slept.length >= 4) {
    const rested = slept.filter((d) => (d.sleep_hours as number) >= 7);
    const tired = slept.filter((d) => (d.sleep_hours as number) < 7);
    const rate = (xs: ReviewDay[]) => avg(xs.map((d) => d.tasks_done / d.tasks_planned));
    const r = rate(rested);
    const t = rate(tired);
    if (r !== null && t !== null && rested.length >= 2 && tired.length >= 2 && r - t >= 0.15) {
      observations.push("On days after 7+ hours of sleep, you finished more of what you planned.");
    }
  }

  const energetic = days.filter((d) => d.energy !== null && d.movement_minutes > 0);
  const still = days.filter((d) => d.energy !== null && d.movement_minutes === 0);
  const e1 = avg(energetic.map((d) => d.energy));
  const e2 = avg(still.map((d) => d.energy));
  if (energetic.length >= 2 && still.length >= 2 && e1 !== null && e2 !== null && e1 - e2 >= 0.5) {
    observations.push("Your energy tended to be higher on days you moved a little.");
  }

  if (s.habitRhythm !== null && s.habitRhythm >= 70) observations.push(`Your habits held a steady rhythm: ${Math.round(s.habitRhythm)}% of check-offs.`);
  if (s.focusMinutes >= 60) observations.push(`You gave ${s.focusMinutes} minutes of focus this week.`);
  if (s.journalDays >= 3) observations.push(`You wrote on ${s.journalDays} days. That's a lovely habit to keep.`);
  const moods = days.filter((d) => d.mood !== null);
  if (moods.length >= 3) observations.push(`You felt mostly ${moodLabel(Math.round(avg(moods.map((d) => d.mood)) as number)).toLowerCase()} this week.`);

  if (s.tasksPlanned > 0 && s.tasksDone / s.tasksPlanned < 0.4) {
    suggestions.push("Try planning one or two fewer things a day. A shorter list is easier to love.");
  }
  if (s.averageSleep !== null && s.averageSleep < 6.5) suggestions.push("A slightly earlier wind-down might help your mornings.");
  if (s.habitRhythm !== null && s.habitRhythm < 40) suggestions.push("If a habit feels heavy, make it smaller rather than dropping it.");
  if (s.checkinDays < 3) suggestions.push("A quick evening check-in on a few more days will make next week's picture clearer.");

  return { observations, suggestions };
}

/** The 7 days ending on `today`, oldest first. */
export async function fetchWeek(today: string): Promise<WeekSummary> {
  // This week plus the three before it, all in parallel (one round trip).
  const supabase = createClient();
  const [habits, ...reviews] = await Promise.all([
    fetchHabits(today),
    ...[0, 7, 14, 21].map((back) => supabase.rpc("weekly_review", { p_end: addDays(today, -back) })),
  ]);
  const weeks = reviews.map((r) => {
    if (r.error) throw new Error(r.error.message);
    return (r.data as ReviewDay[]).map((d) => ({
      ...d,
      sleep_hours: d.sleep_hours === null ? null : Number(d.sleep_hours),
    }));
  });
  const days = weeks[0];
  const history = weeks.slice().reverse().flat();

  const habitTotal = days.reduce((s, d) => s + d.habits_total, 0);
  const base = {
    days,
    tasksDone: days.reduce((s, d) => s + d.tasks_done, 0),
    tasksPlanned: days.reduce((s, d) => s + d.tasks_planned, 0),
    habitRhythm: habitTotal ? (Math.min(habitTotal, days.reduce((s, d) => s + d.habits_done, 0)) / habitTotal) * 100 : null,
    averageSleep: avg(days.map((d) => d.sleep_hours)),
    averageMood: avg(days.map((d) => d.mood)),
    averageScore: avg(days.map((d) => d.score)),
    focusMinutes: days.reduce((s, d) => s + d.focus_minutes, 0),
    movementMinutes: days.reduce((s, d) => s + d.movement_minutes, 0),
    waterGlasses: days.reduce((s, d) => s + (d.water_glasses ?? 0), 0),
    journalDays: days.filter((d) => d.journaled).length,
    checkinDays: days.filter((d) => d.mood !== null).length,
  };

  return {
    ...base,
    history,
    habits: habits.map((h) => ({ id: h.id, title: h.title, daysDone: h.recent_dates.length })),
    ...observe(days, base),
  };
}
