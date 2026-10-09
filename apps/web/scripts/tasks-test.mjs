// Checks the task rules in the database: priority limit, title validation and
// carry-over. Run from apps/web after applying migration 20261009000000_tasks.sql:
//   npm run test:tasks
// Creates two throwaway users (dovie-tasks-*@example.com); delete them later in
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
    email: `dovie-tasks-${label}-${stamp}@example.com`,
    password: `Tmp-${stamp}-pw!`,
    options: { data: { display_name: `Tasks ${label}`, is_adult_confirmed: true } },
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

// New users default to Asia/Kolkata.
const today = ymd(new Date(), "Asia/Kolkata");
const yesterday = shift(today, -1);
const twoDaysAgo = shift(today, -2);

const a = await signUp("a");
const b = await signUp("b");
const insert = (c, row) => c.client.from("tasks").insert(row).select().single();

// ---- title validation ----
const empty = await insert(a, { title: "   ", due_date: today });
check("rejects a blank title", !!empty.error);
const long = await insert(a, { title: "x".repeat(201), due_date: today });
check("rejects a title over 200 characters", !!long.error);
const exact = await insert(a, { title: "x".repeat(200), due_date: today });
check("accepts a 200-character title", !exact.error, exact.error?.message);

// ---- priority limit ----
const p = [];
for (let i = 1; i <= 3; i++) {
  const r = await insert(a, { title: `priority ${i}`, due_date: today, is_priority: true });
  check(`priority ${i} of 3 is allowed`, !r.error, r.error?.message);
  p.push(r.data);
}
const fourth = await insert(a, { title: "priority 4", due_date: today, is_priority: true });
check("4th priority on the same day is rejected", fourth.error?.message?.includes("priority_limit"), fourth.error?.message);

const other = await insert(a, { title: "plain", due_date: today });
const promote = await a.client.from("tasks").update({ is_priority: true }).eq("id", other.data.id).select();
check("promoting a 4th task is rejected", promote.error?.message?.includes("priority_limit"), promote.error?.message);

const tomorrowP = await insert(a, { title: "tomorrow priority", due_date: shift(today, 1), is_priority: true });
check("priorities are counted per day (tomorrow is separate)", !tomorrowP.error, tomorrowP.error?.message);

await a.client.from("tasks").update({ is_priority: false }).eq("id", p[0].id);
const retry = await a.client.from("tasks").update({ is_priority: true }).eq("id", other.data.id).select();
check("a slot frees up after un-starring", !retry.error && retry.data?.length === 1, retry.error?.message);

// Soft-deleted priorities do not count toward the limit.
await a.client.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", p[1].id);
const afterDelete = await insert(a, { title: "after delete", due_date: today, is_priority: true });
check("a soft-deleted priority frees a slot", !afterDelete.error, afterDelete.error?.message);

// Limit is per user: B can still use priorities on the same day.
const bPrio = await insert(b, { title: "B priority", due_date: today, is_priority: true });
check("the limit is per user", !bPrio.error, bPrio.error?.message);

// ---- carry-over ----
const overduePrio = await insert(a, { title: "overdue priority", due_date: yesterday, is_priority: true });
const overdueOld = await insert(a, { title: "overdue 2 days", due_date: twoDaysAgo });
const overdueDone = await insert(a, {
  title: "overdue but done",
  due_date: yesterday,
  completed_at: new Date().toISOString(),
});
const overdueDeleted = await insert(a, {
  title: "overdue but deleted",
  due_date: yesterday,
  deleted_at: new Date().toISOString(),
});
const bOverdue = await insert(b, { title: "B overdue", due_date: yesterday });

// Today already has 3 priorities for A, so a carried priority must be demoted.
const moved = await a.client.rpc("carry_over_tasks");
check("carry_over_tasks reports 2 moved", moved.data === 2, `${moved.data} ${moved.error?.message ?? ""}`);

const get = async (c, id) => (await c.client.from("tasks").select("*").eq("id", id).single()).data;

const t1 = await get(a, overduePrio.data.id);
check("overdue task moves to today", t1.due_date === today, t1.due_date);
check("carried task loses its priority flag", t1.is_priority === false);
check("carry_count is incremented", t1.carry_count === 1, String(t1.carry_count));

const t2 = await get(a, overdueOld.data.id);
check("older overdue task moves to today", t2.due_date === today, t2.due_date);

const t3 = await get(a, overdueDone.data.id);
check("completed overdue task stays put", t3.due_date === yesterday, t3.due_date);

const t4 = await get(a, overdueDeleted.data.id);
check("deleted overdue task stays put", t4.due_date === yesterday, t4.due_date);

const t5 = await get(b, bOverdue.data.id);
check("A's carry-over does not touch B's tasks", t5.due_date === yesterday, t5.due_date);

const again = await a.client.rpc("carry_over_tasks");
check("running carry-over again is a no-op", again.data === 0, String(again.data));

const anon = createClient(url, key, { auth: { persistSession: false } });
const anonCall = await anon.rpc("carry_over_tasks");
check("anonymous users cannot run carry-over", !!anonCall.error, "call succeeded");

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll task checks passed");
process.exit(failed ? 1 : 0);
