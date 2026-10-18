import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";
import { carryOverOnce } from "@/features/tasks/api";
import type { Task } from "@/features/tasks/types";

/** The six Monday-to-Sunday weeks that show a month, as [first, last] dates. */
export function monthGrid(month: string): { start: string; end: string; days: string[] } {
  const first = `${month}-01`;
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(first, -weekday);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return { start, end: days[41], days };
}

/** Every task in the visible grid of a month. Unfinished past tasks are carried to today first. */
export async function fetchPlannerMonth(month: string, today: string): Promise<Task[]> {
  await carryOverOnce(today);
  const { start, end } = monthGrid(month);
  const { data, error } = await createClient()
    .from("tasks")
    .select("id,title,due_date,is_priority,completed_at,carry_count,created_at")
    .is("deleted_at", null)
    .gte("due_date", start)
    .lte("due_date", end)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
}

/** Moves several unfinished tasks to another day in one request. */
export async function moveTasks(ids: string[], date: string) {
  if (!ids.length) return;
  const { error } = await createClient().from("tasks").update({ due_date: date, is_priority: false }).in("id", ids);
  if (error) throw new Error(error.message);
}
