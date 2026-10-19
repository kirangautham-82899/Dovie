// Mood × Money: how the user's own check-ins (mood, energy, sleep) line up
// with what they spend that day. Pure and dependency-free so it runs on the
// device and in tests; nothing here is sent anywhere.

/** The day before an ISO date. Kept local so this file has no imports (tests load it directly). */
function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type DayFeeling = { date: string; mood: number | null; energy: number | null; sleep: number | null };
type Spend = { spent_on: string; amount_paise: number; category: string };

/** Check-in days with spending data needed before patterns are shown. */
export const MIN_DAYS = 10;
/** Days needed in each side of a comparison. */
const MIN_GROUP = 3;

export type Signal = "mood" | "energy" | "sleep";

export type Insight = {
  signal: Signal;
  /** Average daily spend on low days and on the rest. */
  lowAvg: number;
  restAvg: number;
  /** lowAvg / restAvg (Infinity when the rest average is 0). */
  ratio: number;
  lowDays: number;
  restDays: number;
  /** Category that explains most of the gap, if one clearly does. */
  topCategory: string | null;
  /** Rough extra spend a month from this pattern, in paise. */
  monthlyCost: number;
};

export type MoodBar = { mood: number; avg: number; days: number };

export type MoodMoney = {
  /** Check-in days that could be matched with spending. */
  days: number;
  ready: boolean;
  /** Patterns where low days cost noticeably more, strongest first. */
  insights: Insight[];
  /** Signals where low days cost noticeably less (reassuring). */
  calm: Signal[];
  bars: MoodBar[];
  /** Today's check-in, for a same-day heads-up. */
  today: DayFeeling | null;
};

const LOW: Record<Signal, (d: DayFeeling) => boolean | null> = {
  mood: (d) => (d.mood === null ? null : d.mood <= 2),
  energy: (d) => (d.energy === null ? null : d.energy <= 2),
  sleep: (d) => (d.sleep === null ? null : d.sleep < 6),
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function analyseMoodMoney(input: { today: string; feelings: DayFeeling[]; expenses: Spend[] }): MoodMoney {
  const { today, feelings, expenses } = input;
  const todayFeeling = feelings.find((d) => d.date === today) ?? null;

  // Only compare days the user was logging spending: from their first expense
  // up to yesterday (today isn't over yet). Days with no expenses count as ₹0.
  const firstSpend = expenses.reduce<string | null>((min, e) => (min === null || e.spent_on < min ? e.spent_on : min), null);
  const spendByDay = new Map<string, number>();
  const catByDay = new Map<string, Map<string, number>>();
  for (const e of expenses) {
    spendByDay.set(e.spent_on, (spendByDay.get(e.spent_on) ?? 0) + e.amount_paise);
    const cats = catByDay.get(e.spent_on) ?? new Map<string, number>();
    cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount_paise);
    catByDay.set(e.spent_on, cats);
  }

  const yesterday = dayBefore(today);
  const days = firstSpend
    ? feelings.filter((d) => d.date >= firstSpend && d.date <= yesterday && (d.mood !== null || d.energy !== null || d.sleep !== null))
    : [];
  const spendOn = (d: DayFeeling) => spendByDay.get(d.date) ?? 0;

  const bars: MoodBar[] = [1, 2, 3, 4, 5].map((mood) => {
    const group = days.filter((d) => d.mood === mood);
    return { mood, avg: avg(group.map(spendOn)), days: group.length };
  });

  const ready = days.length >= MIN_DAYS;
  const insights: Insight[] = [];
  const calm: Signal[] = [];

  if (ready) {
    for (const signal of ["mood", "energy", "sleep"] as Signal[]) {
      const low = days.filter((d) => LOW[signal](d) === true);
      const rest = days.filter((d) => LOW[signal](d) === false);
      if (low.length < MIN_GROUP || rest.length < MIN_GROUP) continue;

      const lowAvg = avg(low.map(spendOn));
      const restAvg = avg(rest.map(spendOn));
      const ratio = restAvg > 0 ? lowAvg / restAvg : lowAvg > 0 ? Infinity : 1;
      const gap = lowAvg - restAvg;

      if (ratio >= 1.25 && gap >= 100_00) {
        // Which category's daily average grows the most on low days?
        const catAvg = (group: DayFeeling[]) => {
          const totals = new Map<string, number>();
          for (const d of group) for (const [c, v] of catByDay.get(d.date) ?? []) totals.set(c, (totals.get(c) ?? 0) + v);
          return new Map([...totals].map(([c, v]) => [c, v / group.length]));
        };
        const lowCats = catAvg(low);
        const restCats = catAvg(rest);
        const [topCategory, topGap] = [...lowCats].reduce<[string | null, number]>(
          (best, [c, v]) => (v - (restCats.get(c) ?? 0) > best[1] ? [c, v - (restCats.get(c) ?? 0)] : best),
          [null, 0],
        );
        const lowShare = low.length / (low.length + rest.length);
        insights.push({
          signal,
          lowAvg,
          restAvg,
          ratio,
          lowDays: low.length,
          restDays: rest.length,
          // Only name a category that explains at least half the gap.
          topCategory: topGap >= gap * 0.5 ? topCategory : null,
          monthlyCost: Math.round(gap * lowShare * 30),
        });
      } else if (restAvg > 0 && ratio <= 0.8) {
        calm.push(signal);
      }
    }
    insights.sort((a, b) => b.monthlyCost - a.monthlyCost);
  }

  return { days: days.length, ready, insights, calm, bars, today: todayFeeling };
}
