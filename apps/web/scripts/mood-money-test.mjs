// Checks the Mood × Money pattern maths with fixed inputs.
// Run from apps/web:  npm run test:mood-money   (no Supabase needed)
import { analyseMoodMoney, MIN_DAYS } from "../src/features/money/mood-money.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};

const day = (n) => `2026-10-${String(n).padStart(2, "0")}`;
const feel = (n, mood, energy = null, sleep = null) => ({ date: day(n), mood, energy, sleep });
const exp = (n, rupees, category = "Food") => ({ spent_on: day(n), amount_paise: rupees * 100, category });

// 1. Not enough days yet.
{
  const mm = analyseMoodMoney({ today: day(6), feelings: [1, 2, 3, 4, 5].map((n) => feel(n, 3)), expenses: [exp(1, 100)] });
  check("fewer than MIN_DAYS is not ready", !mm.ready && mm.days === 5 && mm.insights.length === 0, JSON.stringify(mm));
}

// 2. Low-mood days cost more, mostly Food. Days 1-14: moods alternate low (2) and good (4).
{
  const feelings = Array.from({ length: 14 }, (_, i) => feel(i + 1, i % 2 === 0 ? 2 : 4));
  const expenses = [];
  for (let n = 1; n <= 14; n++) {
    expenses.push(exp(n, 200, "Transport"));
    if (n % 2 === 1) expenses.push(exp(n, 600, "Food")); // low days add ₹600 of Food
  }
  const mm = analyseMoodMoney({ today: day(15), feelings, expenses });
  const top = mm.insights[0];
  check("ready after enough days", mm.ready && mm.days === 14 && MIN_DAYS <= 14);
  check("finds the mood pattern", top?.signal === "mood", JSON.stringify(mm.insights));
  check("low days average ₹800, others ₹200", top?.lowAvg === 80000 && top?.restAvg === 20000, `${top?.lowAvg} ${top?.restAvg}`);
  check("ratio is 4×", top?.ratio === 4);
  check("names Food as the driver", top?.topCategory === "Food", top?.topCategory);
  check("monthly cost is gap × share of low days × 30", top?.monthlyCost === 60000 * 0.5 * 30, top?.monthlyCost);
  check("mood bars average per mood", mm.bars[1].avg === 80000 && mm.bars[3].avg === 20000 && mm.bars[0].days === 0);
}

// 3. Steady spending gives no insight; cheaper low days read as calm.
{
  const feelings = Array.from({ length: 12 }, (_, i) => feel(i + 1, i % 2 === 0 ? 1 : 5));
  const steady = analyseMoodMoney({
    today: day(13),
    feelings,
    expenses: Array.from({ length: 12 }, (_, i) => exp(i + 1, 300)),
  });
  check("steady spending has no insights", steady.ready && steady.insights.length === 0 && steady.calm.length === 0);
  const calm = analyseMoodMoney({
    today: day(13),
    feelings,
    expenses: Array.from({ length: 12 }, (_, i) => exp(i + 1, i % 2 === 0 ? 100 : 400)),
  });
  check("cheaper low-mood days count as calm", calm.calm.includes("mood") && calm.insights.length === 0, JSON.stringify(calm));
}

// 4. Today is excluded, days before the first expense are ignored, and today's feeling is returned.
{
  const feelings = [feel(1, 2), ...Array.from({ length: 10 }, (_, i) => feel(i + 5, 3)), feel(20, 1)];
  const mm = analyseMoodMoney({ today: day(20), feelings, expenses: [exp(5, 100)] });
  check("only days from the first expense to yesterday count", mm.days === 10, mm.days);
  check("today's check-in is passed through", mm.today?.mood === 1);
}

// 5. Small gaps (under ₹100 a day) are not worth mentioning.
{
  const feelings = Array.from({ length: 12 }, (_, i) => feel(i + 1, 3, i % 2 === 0 ? 1 : 5));
  const mm = analyseMoodMoney({
    today: day(13),
    feelings,
    expenses: Array.from({ length: 12 }, (_, i) => exp(i + 1, i % 2 === 0 ? 150 : 100)),
  });
  check("a ₹50/day gap is ignored even at 1.5×", mm.insights.length === 0, JSON.stringify(mm.insights));
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll mood × money checks passed");
process.exit(failed ? 1 : 0);
