import { createClient } from "@/lib/supabase/client";

/** A daily fitness target, e.g. 30 min or 8000 steps. */
export type FitnessGoal = {
  id: string;
  title: string;
  target_value: number;
  unit: string;
  /** Sum of today's logs for this goal. */
  today_total: number;
};

export type FitnessGoalInput = { title: string; target: number; unit: string };

export async function fetchFitnessGoals(today: string): Promise<FitnessGoal[]> {
  const supabase = createClient();
  const [goals, logs] = await Promise.all([
    supabase
      .from("goals")
      .select("id,title,target_value,unit,created_at")
      .eq("kind", "fitness")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase.from("workout_logs").select("goal_id,value").eq("log_date", today),
  ]);
  if (goals.error) throw new Error(goals.error.message);
  if (logs.error) throw new Error(logs.error.message);

  const totals = new Map<string, number>();
  for (const l of logs.data ?? []) {
    if (l.goal_id) totals.set(l.goal_id, (totals.get(l.goal_id) ?? 0) + Number(l.value ?? 0));
  }
  return (goals.data ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    target_value: Number(g.target_value),
    unit: g.unit,
    today_total: totals.get(g.id) ?? 0,
  }));
}

export async function addFitnessGoal(input: FitnessGoalInput) {
  const { error } = await createClient().from("goals").insert({
    kind: "fitness",
    title: input.title.trim(),
    target_value: input.target,
    unit: input.unit.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function updateFitnessGoal(id: string, input: FitnessGoalInput) {
  const { error } = await createClient()
    .from("goals")
    .update({ title: input.title.trim(), target_value: input.target, unit: input.unit.trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Soft delete; past workout logs are kept. */
export async function deleteFitnessGoal(id: string) {
  const { error } = await createClient()
    .from("goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function logProgress(goalId: string, value: number, today: string) {
  const { error } = await createClient()
    .from("workout_logs")
    .insert({ goal_id: goalId, log_date: today, value });
  if (error) throw new Error(error.message);
}

export async function resetToday(goalId: string, today: string) {
  const { error } = await createClient().from("workout_logs").delete().eq("goal_id", goalId).eq("log_date", today);
  if (error) throw new Error(error.message);
}
