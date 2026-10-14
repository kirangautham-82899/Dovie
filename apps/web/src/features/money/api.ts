import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";

export type Expense = { id: string; amount_paise: number; category: string; note: string | null; spent_on: string };
export type Recurrence = "once" | "weekly" | "monthly" | "yearly";
export type Bill = {
  id: string;
  title: string;
  amount_paise: number | null;
  due_date: string;
  recurrence: Recurrence;
  last_paid_on: string | null;
};
export type Budget = { id: string; category: string; monthly_limit_paise: number };
export type SavingsGoal = {
  id: string;
  title: string;
  target_paise: number;
  saved_paise: number;
  target_date: string | null;
  created_at: string;
};

export type MoneyState = {
  expenses: Expense[];
  /** Expenses from the 90 days before this month, for the forecast. */
  history: Expense[];
  bills: Bill[];
  budgets: Budget[];
  goals: SavingsGoal[];
};

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

/** This month's expenses plus every open bill, budget and savings goal. */
export async function fetchMoney(today: string): Promise<MoneyState> {
  const supabase = createClient();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [expenses, history, bills, budgets, goals] = await Promise.all([
    supabase
      .from("expenses")
      .select("id,amount_paise,category,note,spent_on")
      .is("deleted_at", null)
      .gte("spent_on", monthStart)
      .lte("spent_on", today)
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("id,amount_paise,category,note,spent_on")
      .is("deleted_at", null)
      .gte("spent_on", addDays(monthStart, -90))
      .lt("spent_on", monthStart),
    supabase
      .from("bills")
      .select("id,title,amount_paise,due_date,recurrence,last_paid_on")
      .is("deleted_at", null)
      .is("paid_at", null)
      .order("due_date"),
    supabase.from("budgets").select("id,category,monthly_limit_paise").order("category"),
    supabase
      .from("savings_goals")
      .select("id,title,target_paise,saved_paise,target_date,created_at")
      .is("deleted_at", null)
      .order("created_at"),
  ]);
  return {
    expenses: check(expenses).map((e) => ({ ...e, amount_paise: Number(e.amount_paise) })),
    history: check(history).map((e) => ({ ...e, amount_paise: Number(e.amount_paise) })),
    bills: check(bills).map((b) => ({ ...b, amount_paise: b.amount_paise === null ? null : Number(b.amount_paise) })),
    budgets: check(budgets).map((b) => ({ ...b, monthly_limit_paise: Number(b.monthly_limit_paise) })),
    goals: check(goals).map((g) => ({
      ...g,
      target_paise: Number(g.target_paise),
      saved_paise: Number(g.saved_paise),
    })),
  };
}

/** Unpaid bills due within the next week, overdue ones included. */
export async function fetchBillsDue(today: string): Promise<Bill[]> {
  const r = await createClient()
    .from("bills")
    .select("id,title,amount_paise,due_date,recurrence,last_paid_on")
    .is("deleted_at", null)
    .is("paid_at", null)
    .lte("due_date", addDays(today, 7))
    .order("due_date");
  return check(r).map((b) => ({ ...b, amount_paise: b.amount_paise === null ? null : Number(b.amount_paise) }));
}

export async function addExpense(v: { amount_paise: number; category: string; note: string; spent_on: string }) {
  check(
    await createClient()
      .from("expenses")
      .insert({ ...v, note: v.note.trim() || null }),
  );
}

export async function deleteExpense(id: string) {
  check(await createClient().from("expenses").update({ deleted_at: new Date().toISOString() }).eq("id", id));
}

export async function addBill(v: { title: string; amount_paise: number | null; due_date: string; recurrence: Recurrence }) {
  check(await createClient().from("bills").insert({ ...v, title: v.title.trim() }));
}

export async function markBillPaid(id: string) {
  check(await createClient().rpc("mark_bill_paid", { p_bill: id }));
}

export async function deleteBill(id: string) {
  check(await createClient().from("bills").update({ deleted_at: new Date().toISOString() }).eq("id", id));
}

export async function setBudget(category: string, monthly_limit_paise: number) {
  check(
    await createClient()
      .from("budgets")
      .upsert({ category, monthly_limit_paise }, { onConflict: "user_id,category" }),
  );
}

export async function deleteBudget(id: string) {
  check(await createClient().from("budgets").delete().eq("id", id));
}

export async function addSavingsGoal(v: { title: string; target_paise: number; target_date: string | null }) {
  check(await createClient().from("savings_goals").insert({ ...v, title: v.title.trim() }));
}

export async function addSavings(id: string, amount_paise: number) {
  check(await createClient().rpc("add_savings", { p_goal: id, p_amount_paise: amount_paise }));
}

export async function deleteSavingsGoal(id: string) {
  check(await createClient().from("savings_goals").update({ deleted_at: new Date().toISOString() }).eq("id", id));
}
