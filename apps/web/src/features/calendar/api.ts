import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";

export type CalendarTask = { id: string; title: string; due_date: string; is_priority: boolean; completed_at: string | null };
export type TimeBlock = { id: string; title: string; block_date: string; starts_at: string; ends_at: string };

export type Week = { tasks: CalendarTask[]; blocks: TimeBlock[] };

/** Tasks and time blocks for the 7 days starting today. */
export async function fetchWeekPlan(today: string): Promise<Week> {
  const supabase = createClient();
  const end = addDays(today, 6);
  const [tasks, blocks] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,title,due_date,is_priority,completed_at")
      .is("deleted_at", null)
      .gte("due_date", today)
      .lte("due_date", end)
      .order("created_at"),
    supabase
      .from("time_blocks")
      .select("id,title,block_date,starts_at,ends_at")
      .gte("block_date", today)
      .lte("block_date", end)
      .order("starts_at"),
  ]);
  if (tasks.error) throw new Error(tasks.error.message);
  if (blocks.error) throw new Error(blocks.error.message);
  return { tasks: tasks.data as CalendarTask[], blocks: blocks.data as TimeBlock[] };
}

export async function addTaskOn(title: string, date: string) {
  const { error } = await createClient().from("tasks").insert({ title: title.trim(), due_date: date });
  if (error) throw new Error(error.message);
}

/** Moving a task drops its priority flag, so the target day never exceeds three. */
export async function moveTask(id: string, date: string) {
  const { error } = await createClient().from("tasks").update({ due_date: date, is_priority: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addBlock(v: { title: string; block_date: string; starts_at: string; ends_at: string }) {
  const { error } = await createClient().from("time_blocks").insert({ ...v, title: v.title.trim() });
  if (error) throw new Error(error.message);
}

export async function deleteBlock(id: string) {
  const { error } = await createClient().from("time_blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
