import { createClient } from "@/lib/supabase/client";
import { carryOverOnce } from "@/features/tasks/api";
import type { Task } from "@/features/tasks/types";
import type { TimeBlock } from "@/features/calendar/api";

export const plannerDayKey = (day: string) => ["planner", "day", day];
export const plannerBlocksKey = (day: string) => ["planner", "blocks", day];

/** Every task planned for one day. Unfinished past tasks are carried to today first. */
export async function fetchPlannerDay(day: string, today: string): Promise<Task[]> {
  await carryOverOnce(today);
  const { data, error } = await createClient()
    .from("tasks")
    .select("id,title,due_date,is_priority,completed_at,carry_count,created_at")
    .is("deleted_at", null)
    .eq("due_date", day)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Task[];
}

/** The timetable entries written on one day, earliest first. */
export async function fetchPlannerBlocks(day: string): Promise<TimeBlock[]> {
  const { data, error } = await createClient()
    .from("time_blocks")
    .select("id,title,block_date,starts_at,ends_at")
    .eq("block_date", day)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TimeBlock[];
}

/** Moves several unfinished tasks to another day in one request. */
export async function moveTasks(ids: string[], date: string) {
  if (!ids.length) return;
  const { error } = await createClient().from("tasks").update({ due_date: date, is_priority: false }).in("id", ids);
  if (error) throw new Error(error.message);
}
