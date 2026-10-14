import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";

export const AREAS = [
  { value: "health", label: "Health" },
  { value: "money", label: "Money" },
  { value: "balance", label: "Balance" },
  { value: "growth", label: "Growth" },
] as const;

export type Area = (typeof AREAS)[number]["value"];

/** A goal you grow toward over time, e.g. "Read 12 books". */
export type Goal = {
  id: string;
  title: string;
  area: Area | null;
  target_value: number | null;
  current_value: number;
  unit: string | null;
};

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await createClient()
    .from("goals")
    .select("id,title,area,target_value,current_value,unit")
    .eq("kind", "general")
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((g) => ({
    ...g,
    target_value: g.target_value === null ? null : Number(g.target_value),
    current_value: Number(g.current_value),
  })) as Goal[];
}

export async function addGoal(v: { title: string; area: Area | null; target: number | null; unit: string }) {
  const { error } = await createClient()
    .from("goals")
    .insert({
      kind: "general",
      title: v.title.trim(),
      area: v.area,
      target_value: v.target,
      unit: v.unit.trim() || null,
    });
  if (error) throw new Error(error.message);
}

export async function addGoalProgress(id: string, amount: number) {
  const { error } = await createClient().rpc("add_goal_progress", { p_goal: id, p_amount: amount });
  if (error) throw new Error(error.message);
}

export async function deleteGoal(id: string) {
  const { error } = await createClient().from("goals").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export type Movement = { id: string; log_date: string; activity: string | null; minutes: number };

/** Free-form movement from the last two weeks, newest first. */
export async function fetchMovement(today: string): Promise<Movement[]> {
  const { data, error } = await createClient()
    .from("workout_logs")
    .select("id,log_date,activity,value")
    .is("goal_id", null)
    .gte("log_date", addDays(today, -13))
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({ id: m.id, log_date: m.log_date, activity: m.activity, minutes: Number(m.value ?? 0) }));
}

export async function deleteMovement(id: string) {
  const { error } = await createClient().from("workout_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
