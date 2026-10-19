// Checks money, journal storage, calendar, wellness, the weekly review and
// account controls against your Supabase project.
// Run from apps/web after applying the 20261012* migrations:
//   npm run test:life
// Creates two throwaway users (dovie-life-*@example.com). User A deletes
// itself at the end; delete B later under Authentication > Users.
// Needs "Confirm email" turned off.
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
const must = (r, what) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

const stamp = Date.now();
async function signUp(label) {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({
    email: `dovie-life-${label}-${stamp}@example.com`,
    password: `Tmp-${stamp}-pw!`,
    options: { data: { display_name: `Life ${label}`, is_adult_confirmed: true } },
  });
  if (error || !data.session) throw new Error(`signup ${label} failed: ${error?.message ?? "no session"}`);
  return { client, id: data.user.id };
}

const T = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const a = await signUp("a");
const b = await signUp("b");

// ---------- money ----------
must(await a.client.from("expenses").insert({ amount_paise: 25000, category: "Food", note: "lunch" }), "insert expense");
must(await a.client.from("incomes").insert({ amount_paise: 5000000, source: "Salary" }), "insert income");
check("a zero income is rejected", !!(await a.client.from("incomes").insert({ amount_paise: 0 })).error);
check("a zero expense is rejected", !!(await a.client.from("expenses").insert({ amount_paise: 0 })).error);

const bill = must(
  await a.client.from("bills").insert({ title: "Internet", amount_paise: 99900, due_date: T, recurrence: "monthly" }).select().single(),
  "insert bill",
);
must(await a.client.rpc("mark_bill_paid", { p_bill: bill.id }), "mark paid");
const paid = must(await a.client.from("bills").select("due_date,paid_at,last_paid_on").eq("id", bill.id).single(), "read bill");
check("a monthly bill rolls forward when paid", paid.due_date > T && paid.paid_at === null && paid.last_paid_on === T);

must(await a.client.from("budgets").upsert({ category: "Food", monthly_limit_paise: 500000 }, { onConflict: "user_id,category" }), "budget");
must(await a.client.from("budgets").upsert({ category: "Food", monthly_limit_paise: 600000 }, { onConflict: "user_id,category" }), "budget again");
const budgets = must(await a.client.from("budgets").select("monthly_limit_paise"), "read budgets");
check("setting a budget twice replaces it", budgets.length === 1 && Number(budgets[0].monthly_limit_paise) === 600000);

const goal = must(await a.client.from("savings_goals").insert({ title: "Trip", target_paise: 1000000 }).select().single(), "goal");
must(await a.client.rpc("add_savings", { p_goal: goal.id, p_amount_paise: 5000 }), "add savings");
must(await a.client.rpc("add_savings", { p_goal: goal.id, p_amount_paise: -999999 }), "remove savings");
const g = must(await a.client.from("savings_goals").select("saved_paise").eq("id", goal.id).single(), "read goal");
check("savings never go below zero", Number(g.saved_paise) === 0);

// ---------- journal storage ----------
must(
  await a.client.from("journal_keys").insert({
    kdf_salt: "\\x000102030405060708090a0b0c0d0e0f",
    kdf_iterations: 600000,
    wrapped_dek: "AQ",
    wrapped_dek_recovery: "AQ",
  }),
  "journal keys",
);
const keys = must(await a.client.from("journal_keys").select("kdf_salt").single(), "read keys");
check("the salt round-trips as hex", keys.kdf_salt === "\\x000102030405060708090a0b0c0d0e0f", keys.kdf_salt);
check(
  "weak KDF iterations are rejected",
  !!(await b.client.from("journal_keys").insert({ kdf_salt: "\\x000102030405060708090a0b0c0d0e0f", kdf_iterations: 1000, wrapped_dek: "x", wrapped_dek_recovery: "y" })).error,
);
const entryId = crypto.randomUUID();
must(await a.client.from("journal_entries").insert({ id: entryId, entry_date: T, ciphertext: "AQ", mood: 4, word_count: 3 }), "entry");
check(
  "only one journal entry per day",
  !!(await a.client.from("journal_entries").insert({ id: crypto.randomUUID(), entry_date: T, ciphertext: "AQ" })).error,
);

// ---------- calendar + wellness ----------
check(
  "a time block must end after it starts",
  !!(await a.client.from("time_blocks").insert({ title: "x", block_date: T, starts_at: "14:00", ends_at: "13:00" })).error,
);
must(await a.client.from("time_blocks").insert({ title: "Lunch", block_date: T, starts_at: "13:00", ends_at: "14:00" }), "block");
must(await a.client.from("checkins").insert({ checkin_date: T, sleep_hours: 7.5, water_glasses: 3, energy: 4 }), "wellness");
must(await a.client.from("focus_sessions").insert({ session_date: T, minutes: 25 }), "focus");
must(await a.client.from("workout_logs").insert({ log_date: T, value: 10, activity: "Movement break" }), "movement");
must(await a.client.from("tasks").insert([{ title: "one", completed_at: new Date().toISOString() }, { title: "two" }]), "tasks");

const review = must(await a.client.rpc("weekly_review", { p_end: T }), "weekly_review");
const day = review.find((d) => d.day === T);
check("weekly_review returns 7 days", review.length === 7);
check(
  "weekly_review totals today",
  day && day.tasks_planned === 2 && day.tasks_done === 1 && day.focus_minutes === 25 && day.movement_minutes === 10 && day.journaled,
  JSON.stringify(day),
);

// ---------- isolation ----------
for (const table of ["expenses", "incomes", "bills", "budgets", "savings_goals", "journal_keys", "journal_entries", "time_blocks", "focus_sessions"]) {
  const { data } = await b.client.from(table).select("*");
  check(`B cannot read A's ${table}`, data?.length === 0);
}
must(await b.client.rpc("mark_bill_paid", { p_bill: bill.id }), "B mark paid");
const after = must(await a.client.from("bills").select("due_date").eq("id", bill.id).single(), "re-read bill");
check("B cannot mark A's bill paid", after.due_date === paid.due_date);
const anon = createClient(url, key, { auth: { persistSession: false } });
check("anonymous users cannot call weekly_review", !!(await anon.rpc("weekly_review", { p_end: T })).error);
check("anonymous users cannot call delete_my_account", !!(await anon.rpc("delete_my_account")).error);

// ---------- clear + delete ----------
must(await a.client.rpc("clear_my_data"), "clear_my_data");
const left = [
  ...must(await a.client.from("expenses").select("id"), "after clear"),
  ...must(await a.client.from("incomes").select("id"), "incomes after clear"),
];
const prof = must(await a.client.from("profiles").select("onboarded_at").single(), "profile after clear");
check("clear_my_data removes records and resets onboarding", left.length === 0 && prof.onboarded_at === null);

must(await a.client.rpc("delete_my_account"), "delete_my_account");
const gone = await a.client.from("profiles").select("id");
check("delete_my_account removes the profile", (gone.data ?? []).length === 0);

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll money, journal, calendar, review and account checks passed");
process.exit(failed ? 1 : 0);
