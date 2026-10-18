import { createClient } from "@/lib/supabase/client";
import type { Task } from "./types";

const COLUMNS = "id,title,due_date,is_priority,completed_at,carry_count,created_at";

export class PriorityLimitError extends Error {
  constructor() {
    super("You can pick at most 3 priorities per day.");
  }
}

function fail(error: { message: string }): never {
  if (error.message.includes("priority_limit")) throw new PriorityLimitError();
  throw new Error(error.message);
}

// Carry-over only has work to do once per day, so it runs on the first tasks
// load of each day instead of in front of every fetch.
let carriedOn: string | null = null;

/** Moves unfinished overdue tasks to today, at most once a day per visit. */
export async function carryOverOnce(today: string) {
  if (carriedOn === today) return;
  const carried = await createClient().rpc("carry_over_tasks");
  if (carried.error) fail(carried.error);
  carriedOn = today;
}

/** Moves unfinished overdue tasks to today (once a day), then returns today's tasks. */
export async function fetchTodayTasks(today: string): Promise<Task[]> {
  const supabase = createClient();
  await carryOverOnce(today);

  const { data, error } = await supabase
    .from("tasks")
    .select(COLUMNS)
    .eq("due_date", today)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) fail(error);
  return (data ?? []) as Task[];
}

export async function addTask(title: string, today: string, isPriority: boolean) {
  const { error } = await createClient()
    .from("tasks")
    .insert({ title: title.trim(), due_date: today, is_priority: isPriority });
  if (error) fail(error);
}

export async function setCompleted(id: string, done: boolean) {
  const { error } = await createClient()
    .from("tasks")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) fail(error);
}

export async function setPriority(id: string, isPriority: boolean) {
  const { error } = await createClient().from("tasks").update({ is_priority: isPriority }).eq("id", id);
  if (error) fail(error);
}

export async function renameTask(id: string, title: string) {
  const { error } = await createClient().from("tasks").update({ title: title.trim() }).eq("id", id);
  if (error) fail(error);
}

/** Soft delete, so the row can be restored or purged later. */
export async function deleteTask(id: string) {
  const { error } = await createClient()
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fail(error);
}
