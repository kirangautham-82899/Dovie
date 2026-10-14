// Checks the daily score and check-in rules in the database.
// Run from apps/web after applying migration 20261011000000_checkins.sql:
//   npm run test:checkin
// Creates two throwaway users (dovie-checkin-*@example.com); delete them later in
// Supabase under Authentication > Users. Needs "Confirm email" turned off.
//
// Score weights: priorities 40, other tasks 20, habits 25, fitness 15.
// Categories with nothing planned are dropped and the rest are rescaled.
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
    email: `dovie-checkin-${label}-${stamp}@example.com`,
    password: `Tmp-${stamp}-pw!`,
    options: { data: { display_name: `Checkin ${label}`, is_adult_confirmed: true } },
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

const score = async (c) => {
  const { data, error } = await c.client.rpc("daily_score", { p_date: T });
  if (error) throw new Error(`daily_score failed: ${error.message}`);
  return data;
};
const done = () => new Date().toISOString();
const must = (r, what) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

// ---------- score: nothing planned ----------
check("no plans gives a null score", (await score(a)) === null);

const { data: rows0 } = await a.client.rpc("score_breakdown", { p_date: T });
check(
  "breakdown has the 4 categories with the right weights",
  rows0?.length === 4 &&
    ["priorities:40", "tasks:20", "habits:25", "fitness:15"].every((x) =>
      rows0.some((r) => `${r.category}:${r.weight}` === x),
    ),
  JSON.stringify(rows0),
);

// ---------- score: tasks only ----------
const task = async (row) => must(await a.client.from("tasks").insert({ due_date: T, ...row }).select().single(), "task");
const p1 = await task({ title: "P1 done", is_priority: true, completed_at: done() });
const p2 = await task({ title: "P2 open", is_priority: true });
await task({ title: "T1 done", completed_at: done() });
await task({ title: "T2 done", completed_at: done() });
// priorities 1/2 * 40 = 20, tasks 2/2 * 20 = 20, weights present = 60 -> 40/60 = 66.67
check("tasks only: score is 67", (await score(a)) === 67, String(await score(a)));

// A deleted task does not count.
const ghost = await task({ title: "ghost", is_priority: true });
await a.client.from("tasks").update({ deleted_at: done() }).eq("id", ghost.id);
check("a deleted task does not change the score", (await score(a)) === 67, String(await score(a)));

// ---------- score: add habits ----------
const h1 = must(await a.client.from("habits").insert({ title: "H1" }).select().single(), "habit");
const h2 = must(await a.client.from("habits").insert({ title: "H2" }).select().single(), "habit");
must(await a.client.from("habit_logs").insert({ habit_id: h1.id, log_date: T }), "habit log");
// + habits 1/2 * 25 = 12.5; numerator 52.5; weights 85 -> 61.76
check("with habits: score is 62", (await score(a)) === 62, String(await score(a)));

// ---------- score: add fitness ----------
const goal = must(
  await a.client.from("goals").insert({ kind: "fitness", title: "Walk", target_value: 30, unit: "min" }).select().single(),
  "goal",
);
must(await a.client.from("workout_logs").insert({ goal_id: goal.id, log_date: T, value: 15 }), "workout");
// + fitness 15/30 * 15 = 7.5; numerator 60; weights 100 -> 60
check("with fitness at half: score is 60", (await score(a)) === 60, String(await score(a)));

const { data: rows1 } = await a.client.rpc("score_breakdown", { p_date: T });
const get = (cat) => rows1?.find((r) => r.category === cat);
check(
  "breakdown counts match",
  Number(get("priorities")?.done) === 1 &&
    Number(get("priorities")?.total) === 2 &&
    Number(get("habits")?.done) === 1 &&
    Number(get("habits")?.total) === 2 &&
    Number(get("fitness")?.done) === 0.5 &&
    Number(get("fitness")?.total) === 1,
  JSON.stringify(rows1),
);

// ---------- check-in ----------
const before = await score(a);
const ci = await a.client
  .from("checkins")
  .insert({ checkin_date: T, mood: 4, note: "ok day", score: 5 })
  .select()
  .single();
check("check-in for today is accepted", !ci.error, ci.error?.message);
check("the client-supplied score is ignored", ci.data?.score === before && before !== 5, `${ci.data?.score} vs ${before}`);

const dup = await a.client.from("checkins").insert({ checkin_date: T, mood: 3 });
check("a second check-in for today is rejected", !!dup.error);

// Finish everything, then update the check-in: the score is recomputed.
await a.client.from("tasks").update({ completed_at: done() }).eq("id", p2.id);
must(await a.client.from("habit_logs").insert({ habit_id: h2.id, log_date: T }), "habit log 2");
must(await a.client.from("workout_logs").insert({ goal_id: goal.id, log_date: T, value: 45 }), "workout 2");
check("everything done (fitness capped at 100%) scores 100", (await score(a)) === 100, String(await score(a)));

const upd = await a.client
  .from("checkins")
  .update({ mood: 5, note: "great day", score: 1, checkin_date: shift(T, -1) })
  .eq("id", ci.data.id)
  .select()
  .single();
check("updating today's check-in changes mood and note", upd.data?.mood === 5 && upd.data?.note === "great day", upd.error?.message);
check("the score is recomputed on update, not taken from the client", upd.data?.score === 100, String(upd.data?.score));
check("the check-in date cannot be changed", upd.data?.checkin_date === T, upd.data?.checkin_date);

// ---------- check-in validation ----------
const bad = (row) => b.client.from("checkins").insert(row);
check("yesterday is rejected", !!(await bad({ checkin_date: shift(T, -1), mood: 3 })).error);
check("tomorrow is rejected", !!(await bad({ checkin_date: shift(T, 1), mood: 3 })).error);
check("mood 0 is rejected", !!(await bad({ checkin_date: T, mood: 0 })).error);
check("mood 6 is rejected", !!(await bad({ checkin_date: T, mood: 6 })).error);
check("a note over 500 characters is rejected", !!(await bad({ checkin_date: T, mood: 3, note: "n".repeat(501) })).error);

// B checks in with nothing planned: allowed, with a null score.
const bCi = await b.client.from("checkins").insert({ checkin_date: T, mood: 3 }).select().single();
check("a check-in with nothing planned has a null score", !bCi.error && bCi.data.score === null, bCi.error?.message);

// ---------- isolation ----------
const { data: aSeesB } = await a.client.from("checkins").select("id").eq("user_id", b.id);
check("A cannot see B's check-in", aSeesB?.length === 0);
check("B's score ignores A's data", (await score(b)) === null);

const anon = createClient(url, key, { auth: { persistSession: false } });
check("anonymous users cannot call daily_score", !!(await anon.rpc("daily_score", { p_date: T })).error);
check("anonymous users cannot call score_breakdown", !!(await anon.rpc("score_breakdown", { p_date: T })).error);

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll check-in and score checks passed");
process.exit(failed ? 1 : 0);
