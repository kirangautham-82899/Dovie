// Checks the goals/habits rules in the database: validation, integrity, streaks.
// Run from apps/web after applying migration 20261010000000_goals_habits.sql:
//   npm run test:habits
// Creates two throwaway users (dovie-habits-*@example.com); delete them later in
// Supabase under Authentication > Users. Needs "Confirm email" turned off.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url?.startsWith("https://") || !key) {
  console.error("Missing/invalid NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  if (!ok) failed++;
};

const stamp = Date.now();
async function signUp(label) {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({
    email: `dovie-habits-${label}-${stamp}@example.com`,
    password: `Tmp-${stamp}-pw!`,
    options: { data: { display_name: `Habits ${label}`, is_adult_confirmed: true } },
  });
  if (error || !data.session) throw new Error(`signup ${label} failed: ${error?.message ?? "no session"}`);
  return { client, id: data.user.id };
}

const ymd = (d, tz) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const shift = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const T = ymd(new Date(), "Asia/Kolkata"); // new users default to Asia/Kolkata

const a = await signUp("a");
const b = await signUp("b");

const newHabit = async (c, title) => (await c.client.from("habits").insert({ title }).select().single());
const logDays = async (c, habitId, offsets) => {
  const rows = offsets.map((o) => ({ habit_id: habitId, log_date: shift(T, o) }));
  return c.client.from("habit_logs").insert(rows);
};
const stats = async (c) => {
  const { data, error } = await c.client.rpc("habit_stats", { p_today: T });
  if (error) throw new Error(`habit_stats failed: ${error.message}`);
  return new Map(data.map((r) => [r.habit_uuid, r]));
};

// ---------- validation ----------
check("rejects a blank habit title", !!(await newHabit(a, "   ")).error);
check("rejects a habit title over 100 characters", !!(await newHabit(a, "x".repeat(101))).error);

const g = (c, row) => c.client.from("goals").insert(row).select().single();
check("fitness goal needs a target", !!(await g(a, { kind: "fitness", title: "Walk", unit: "min" })).error);
check("fitness goal needs a unit", !!(await g(a, { kind: "fitness", title: "Walk", target_value: 30 })).error);
check("target must be positive", !!(await g(a, { kind: "fitness", title: "Walk", target_value: 0, unit: "min" })).error);
check(
  "unit over 20 characters is rejected",
  !!(await g(a, { kind: "fitness", title: "Walk", target_value: 30, unit: "u".repeat(21) })).error,
);
const goodGoal = await g(a, { kind: "fitness", title: "Walk", target_value: 30, unit: "min" });
check("a valid fitness goal is accepted", !goodGoal.error, goodGoal.error?.message);
const general = await g(a, { kind: "general", title: "Read more" });
check("a general goal does not need a target", !general.error, general.error?.message);

// ---------- workout logs ----------
const w = (c, row) => c.client.from("workout_logs").insert(row).select().single();
const goalId = goodGoal.data.id;
check("workout value 0 is rejected", !!(await w(a, { goal_id: goalId, log_date: T, value: 0 })).error);
check("workout value over 100000 is rejected", !!(await w(a, { goal_id: goalId, log_date: T, value: 100001 })).error);
check(
  "workout note over 200 characters is rejected",
  !!(await w(a, { goal_id: goalId, log_date: T, value: 10, note: "n".repeat(201) })).error,
);
check("a valid workout log is accepted", !(await w(a, { goal_id: goalId, log_date: T, value: 20 })).error);
check("workout logs cannot be dated in the future", !!(await w(a, { goal_id: goalId, log_date: shift(T, 1), value: 5 })).error);

const bGoal = await g(b, { kind: "fitness", title: "B run", target_value: 5, unit: "km" });
const crossGoal = await w(a, { goal_id: bGoal.data.id, log_date: T, value: 5 });
check("cannot log against another user's goal", !!crossGoal.error, "insert succeeded");

// ---------- habit log integrity ----------
const h1 = (await newHabit(a, "H1: three-day streak")).data;
const dup = await logDays(a, h1.id, [0]);
check("can log today", !dup.error, dup.error?.message);
check("a second log for the same day is rejected", !!(await logDays(a, h1.id, [0])).error);
const upsert = await a.client
  .from("habit_logs")
  .upsert({ habit_id: h1.id, log_date: T }, { onConflict: "habit_id,log_date", ignoreDuplicates: true });
check("upsert with ignoreDuplicates is idempotent", !upsert.error, upsert.error?.message);
check("habit logs cannot be dated in the future", !!(await logDays(a, h1.id, [1])).error);

const bHabit = (await newHabit(b, "B habit")).data;
const crossHabit = await a.client.from("habit_logs").insert({ habit_id: bHabit.id, log_date: T });
check("cannot log against another user's habit", !!crossHabit.error, "insert succeeded");
const spoof = await b.client.from("habit_logs").insert({ habit_id: h1.id, log_date: shift(T, -5) });
check("B cannot log against A's habit", !!spoof.error, "insert succeeded");

// ---------- streaks ----------
await logDays(a, h1.id, [-1, -2]); // H1: T, T-1, T-2
const h2 = (await newHabit(a, "H2: alive, not done today")).data;
await logDays(a, h2.id, [-1, -2]);
const h3 = (await newHabit(a, "H3: broken then restarted")).data;
await logDays(a, h3.id, [0, -3, -4, -5, -10]);
const h4 = (await newHabit(a, "H4: broken")).data;
await logDays(a, h4.id, [-2]);
const h5 = (await newHabit(a, "H5: never logged")).data;
const h6 = (await newHabit(a, "H6: deleted")).data;
await logDays(a, h6.id, [0, -1]);
await a.client.from("habits").update({ deleted_at: new Date().toISOString() }).eq("id", h6.id);

let s = await stats(a);
const row = (id) => s.get(id);
check("H1 streak is 3 and best is 3", row(h1.id)?.streak === 3 && row(h1.id)?.best === 3, JSON.stringify(row(h1.id)));
check("H1 is done today", row(h1.id)?.done_today === true);
check(
  "H1 recent_dates are the last 3 days",
  JSON.stringify(row(h1.id)?.recent_dates) === JSON.stringify([shift(T, -2), shift(T, -1), T]),
  JSON.stringify(row(h1.id)?.recent_dates),
);
check(
  "H2 streak stays alive when today is not logged yet",
  row(h2.id)?.streak === 2 && row(h2.id)?.done_today === false,
  JSON.stringify(row(h2.id)),
);
check("H3 current streak is 1 and best is 3", row(h3.id)?.streak === 1 && row(h3.id)?.best === 3, JSON.stringify(row(h3.id)));
check(
  "H3 recent_dates exclude logs older than 7 days",
  JSON.stringify(row(h3.id)?.recent_dates) === JSON.stringify([shift(T, -5), shift(T, -4), shift(T, -3), T]),
  JSON.stringify(row(h3.id)?.recent_dates),
);
check("H4 streak is 0 after a missed day, best is 1", row(h4.id)?.streak === 0 && row(h4.id)?.best === 1, JSON.stringify(row(h4.id)));
check("H5 with no logs is 0 / 0", row(h5.id)?.streak === 0 && row(h5.id)?.best === 0 && row(h5.id)?.done_today === false);
check("a deleted habit is not in the stats", !s.has(h6.id));

// Un-logging today keeps the streak alive through yesterday.
await a.client.from("habit_logs").delete().eq("habit_id", h1.id).eq("log_date", T);
s = await stats(a);
check("un-logging today leaves a 2-day streak", row(h1.id)?.streak === 2 && row(h1.id)?.done_today === false, JSON.stringify(row(h1.id)));

// ---------- isolation ----------
const bStats = await stats(b);
check("B only sees stats for B's habits", bStats.size === 1 && bStats.has(bHabit.id), `${bStats.size} rows`);
check("A's stats do not include B's habit", !s.has(bHabit.id));

const anon = createClient(url, key, { auth: { persistSession: false } });
check("anonymous users cannot call habit_stats", !!(await anon.rpc("habit_stats", { p_today: T })).error, "call succeeded");

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll habit and goal checks passed");
process.exit(failed ? 1 : 0);
