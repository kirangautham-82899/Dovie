// "Dovie noticed": picks the one most useful thing to say on Today, from
// numbers the app has already worked out on the device (Mood × Money and the
// month forecast). Pure and import-free so scripts/daily-insight-test.mjs can
// run it directly in Node. Nothing here is sent anywhere.

type Signal = "mood" | "energy" | "sleep";

type MoodMoneyLike = {
  ready: boolean;
  days: number;
  insights: {
    signal: Signal;
    ratio: number;
    lowAvg: number;
    restAvg: number;
    topCategory: string | null;
    monthlyCost: number;
  }[];
  calm: Signal[];
  today: { mood: number | null; energy: number | null; sleep: number | null } | null;
};

type CategoryLike = {
  category: string;
  spent: number;
  projected: number;
  limit: number | null;
  status: "on-track" | "tight" | "over" | "no-budget";
};

export type DailyInsight = {
  id: string;
  /** watch = needs a gentle look, win = good news, gentle = a pattern, learning = still gathering data. */
  tone: "watch" | "win" | "gentle" | "learning";
  title: string;
  body: string;
  href: string | null;
  linkLabel: string | null;
  /** Shown as a progress bar while Dovie is still learning. */
  progress: { done: number; total: number } | null;
};

const LOW_DAY: Record<Signal, string> = {
  mood: "low-mood days",
  energy: "low-energy days",
  sleep: "nights under 6 hours of sleep",
};

const TIP: Record<Signal, string> = {
  mood: "On a low day, wait ten minutes before buying. If you still want it, it's yours.",
  energy: "Keep one easy meal ready for tired evenings, so low energy doesn't turn into delivery.",
  sleep: "After a short night, put off non-urgent buys until tomorrow.",
};

function isLowToday(mm: MoodMoneyLike, signal: Signal) {
  const t = mm.today;
  if (!t) return false;
  if (signal === "mood") return (t.mood ?? 9) <= 2;
  if (signal === "energy") return (t.energy ?? 9) <= 2;
  return (t.sleep ?? 99) < 6;
}

/**
 * @param fmt formats paise as money text (kept out of here so this file stays import-free)
 * @param minDays check-in days needed before Mood × Money can say anything
 */
export function pickDailyInsight(input: {
  moodMoney: MoodMoneyLike | null;
  categories: CategoryLike[];
  minDays: number;
  fmt: (paise: number) => string;
  /** This month so far and where it is heading, when there is any spending to go on. */
  pace?: { spent: number; projected: number; daysLeft: number } | null;
  /** Any expense, bill or budget at all. False means a brand-new money page. */
  hasMoneyData?: boolean;
}): DailyInsight | null {
  const { moodMoney: mm, categories, minDays, fmt, pace = null, hasMoneyData = true } = input;
  const over = categories.filter((c) => c.status === "over" && c.limit !== null);
  const tight = categories.filter((c) => c.status === "tight");
  const budgeted = categories.filter((c) => c.limit !== null);

  // 1. Today already looks like one of the user's costly days: say so now.
  const lowToday = mm?.ready ? mm.insights.find((i) => isLowToday(mm, i.signal)) : undefined;
  if (mm && lowToday) {
    return {
      id: `low-today-${lowToday.signal}`,
      tone: "watch",
      title: "Today looks like one of your pricier days",
      body: `On ${LOW_DAY[lowToday.signal]} you usually spend about ${fmt(lowToday.lowAvg - lowToday.restAvg)} extra. ${TIP[lowToday.signal]}`,
      href: "/money",
      linkLabel: "See Mood × Money",
      progress: null,
    };
  }

  // 2. A budget is on pace to be broken, with the biggest overshoot first.
  if (over.length > 0) {
    const worst = [...over].sort((a, b) => b.projected - (b.limit ?? 0) - (a.projected - (a.limit ?? 0)))[0];
    const by = worst.projected - (worst.limit ?? 0);
    return {
      id: `over-${worst.category}`,
      tone: "watch",
      title: `${worst.category} is heading over budget`,
      body: `At this pace you'll spend about ${fmt(worst.projected)} against a limit of ${fmt(worst.limit ?? 0)}, around ${fmt(by)} over. A small trim now keeps the month calm.`,
      href: "/money",
      linkLabel: "Open your budgets",
      progress: null,
    };
  }

  // 3. The strongest Mood × Money pattern.
  if (mm?.ready && mm.insights.length > 0) {
    const top = mm.insights[0];
    const times = Number.isFinite(top.ratio) ? `${top.ratio.toFixed(1)}×` : "much";
    return {
      id: `pattern-${top.signal}`,
      tone: "gentle",
      title: `On ${LOW_DAY[top.signal]} you spend ${times} more`,
      body: `${top.topCategory ? `Mostly on ${top.topCategory}. ` : ""}That pattern costs roughly ${fmt(top.monthlyCost)} a month. ${TIP[top.signal]}`,
      href: "/money",
      linkLabel: "See the pattern",
      progress: null,
    };
  }

  // 4. A budget is getting close.
  if (tight.length > 0) {
    const c = tight[0];
    return {
      id: `tight-${c.category}`,
      tone: "watch",
      title: `${c.category} is getting close to its limit`,
      body: `About ${fmt(c.projected)} by month end against ${fmt(c.limit ?? 0)}. Still fine; worth a glance.`,
      href: "/money",
      linkLabel: "Open your budgets",
      progress: null,
    };
  }

  // 5. Good news.
  if (mm?.ready && mm.calm.length > 0) {
    return {
      id: "steady",
      tone: "win",
      title: "Your spending stays steady, even on hard days",
      body: "Low moods and short nights don't push your spending up. That's a real strength.",
      href: null,
      linkLabel: null,
      progress: null,
    };
  }
  if (budgeted.length > 0) {
    return {
      id: "budgets-ok",
      tone: "win",
      title: "Every budget is on track this month",
      body: "Nothing is on pace to run over. Keep doing what you're doing.",
      href: "/money",
      linkLabel: "See the forecast",
      progress: null,
    };
  }

  // Enough check-ins and no pattern either way: that is a result too.
  if (mm?.ready) {
    return {
      id: "even",
      tone: "win",
      title: "Your spending stays steady whatever the day feels like",
      body: "Dovie found no link between how you feel and what you spend. A calm place to be.",
      href: null,
      linkLabel: null,
      progress: null,
    };
  }

  // 6. Where the month is heading, so the card always has something real to say.
  if (pace && pace.spent > 0) {
    return {
      id: "pace",
      tone: "gentle",
      title: `${fmt(pace.spent)} spent so far this month`,
      body: `At this pace you'll finish near ${fmt(pace.projected)}, with ${pace.daysLeft} ${pace.daysLeft === 1 ? "day" : "days"} to go.`,
      href: "/money",
      linkLabel: "See the forecast",
      progress: null,
    };
  }

  // A brand-new money page: invite the first entry.
  if (!hasMoneyData) {
    return {
      id: "start",
      tone: "learning",
      title: "Start with one expense",
      body: "Add what you spend and Dovie will forecast your month, then spot how it links to your mood.",
      href: "/money",
      linkLabel: "Add an expense",
      progress: null,
    };
  }

  // 7. Still learning: show the user how close Dovie is to noticing something.
  if (mm && !mm.ready) {
    return {
      id: "learning",
      tone: "learning",
      title: "Dovie is learning your rhythm",
      body: `Check in each evening and keep adding expenses. After ${minDays} days Dovie can show how your mood and money move together.`,
      href: null,
      linkLabel: null,
      progress: { done: Math.min(mm.days, minDays), total: minDays },
    };
  }

  return null;
}

type TaskLike = { title: string; completed_at: string | null; carry_count: number };

/** Plans that keep moving to tomorrow, or a day that's fully done. Needs no money data. */
export function pickPlanInsight(tasks: TaskLike[]): DailyInsight | null {
  const open = tasks.filter((t) => t.completed_at === null);
  const slipping = open.filter((t) => t.carry_count >= 3).sort((a, b) => b.carry_count - a.carry_count);
  if (slipping.length > 0) {
    const top = slipping[0];
    return {
      id: `slipping-${top.title}`,
      tone: "watch",
      title: `“${top.title}” has moved to tomorrow ${top.carry_count} times`,
      body:
        slipping.length > 1
          ? `${slipping.length} plans keep slipping. Shrink one to a five-minute first step, or let it go. Both are fine.`
          : "Try a five-minute first step, or let it go. Both are fine.",
      href: "/planner",
      linkLabel: "Open the planner",
      progress: null,
    };
  }
  if (tasks.length > 0 && open.length === 0) {
    return {
      id: "all-done",
      tone: "win",
      title: `All ${tasks.length} ${tasks.length === 1 ? "plan" : "plans"} done`,
      body: "That's today handled. Rest counts too.",
      href: null,
      linkLabel: null,
      progress: null,
    };
  }
  return null;
}
