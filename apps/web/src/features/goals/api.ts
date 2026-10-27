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
  why: string | null;
  target_date: string | null;
  step: number;
  pinned: boolean;
  completed_at: string | null;
  created_at: string;
};

export type GoalLog = { id: string; goal_id: string; amount: number; note: string | null; log_date: string };
export type Milestone = { id: string; goal_id: string; title: string; done_at: string | null };

/**
 * `advanced` is false until the goals_plus migration has run: goals still load
 * and take progress, but without dates, milestones or a history.
 */
export type GoalsState = { goals: Goal[]; logs: GoalLog[]; milestones: Milestone[]; advanced: boolean };

export const goalsKey = (today: string) => ["goals", today];

/** How far back the history (heatmap, sparklines, streak) reaches. */
export const HISTORY_DAYS = 112;

const BASE = "id,title,area,target_value,current_value,unit,created_at";
const PLUS = `${BASE},why,target_date,step,pinned,completed_at`;

function missing(error: { code?: string } | null) {
  return ["42703", "42P01", "PGRST204", "PGRST205", "PGRST202"].includes(error?.code ?? "");
}

export async function fetchGoals(today: string): Promise<GoalsState> {
  const supabase = createClient();
  const goalsQuery = (cols: string) =>
    supabase.from("goals").select(cols).eq("kind", "general").is("deleted_at", null).order("created_at");
  const [plus, logs, milestones] = await Promise.all([
    goalsQuery(PLUS),
    supabase
      .from("goal_logs")
      .select("id,goal_id,amount,note,log_date")
      .gte("log_date", addDays(today, -HISTORY_DAYS + 1))
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("goal_milestones").select("id,goal_id,title,done_at").order("created_at"),
  ]);

  let rows = plus.data as unknown as Record<string, unknown>[] | null;
  let advanced = !logs.error && !milestones.error;
  if (plus.error) {
    if (!missing(plus.error)) throw new Error(plus.error.message);
    const base = await goalsQuery(BASE);
    if (base.error) throw new Error(base.error.message);
    rows = base.data as unknown as Record<string, unknown>[];
    advanced = false;
  }
  if (logs.error && !missing(logs.error)) throw new Error(logs.error.message);
  if (milestones.error && !missing(milestones.error)) throw new Error(milestones.error.message);

  // Removed goals keep their rows (soft delete), so their steps and milestones
  // are dropped here; otherwise a deleted goal would still count toward the
  // week, the streak and the rhythm.
  const live = new Set((rows ?? []).map((g) => g.id as string));
  return {
    advanced,
    goals: (rows ?? []).map((g) => ({
      id: g.id as string,
      title: g.title as string,
      area: (g.area as Area | null) ?? null,
      target_value: g.target_value === null ? null : Number(g.target_value),
      current_value: Number(g.current_value),
      unit: (g.unit as string | null) ?? null,
      why: (g.why as string | null) ?? null,
      target_date: (g.target_date as string | null) ?? null,
      step: g.step === undefined ? 1 : Number(g.step),
      pinned: !!g.pinned,
      completed_at: (g.completed_at as string | null) ?? null,
      created_at: g.created_at as string,
    })),
    logs: advanced ? (logs.data ?? []).filter((l) => live.has(l.goal_id)).map((l) => ({ ...l, amount: Number(l.amount) })) : [],
    milestones: advanced ? (milestones.data ?? []).filter((m) => live.has(m.goal_id)) : [],
  };
}

export type GoalInput = {
  title: string;
  area: Area | null;
  target: number | null;
  unit: string;
  why: string;
  target_date: string;
  step: number;
};

function row(v: GoalInput, advanced: boolean) {
  const base = { title: v.title.trim(), area: v.area, target_value: v.target, unit: v.unit.trim() || null };
  return advanced ? { ...base, why: v.why.trim() || null, target_date: v.target_date || null, step: v.step } : base;
}

export async function addGoal(v: GoalInput & { milestones: string[] }, advanced: boolean) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goals")
    .insert({ kind: "general", ...row(v, advanced) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const steps = v.milestones.map((t) => t.trim()).filter(Boolean);
  if (advanced && steps.length) {
    const r = await supabase.from("goal_milestones").insert(steps.map((title) => ({ goal_id: data.id, title })));
    if (r.error) throw new Error(r.error.message);
  }
}

export async function updateGoal(id: string, v: GoalInput, advanced: boolean) {
  const { error } = await createClient().from("goals").update(row(v, advanced)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setPinned(id: string, pinned: boolean) {
  const supabase = createClient();
  // One focus goal at a time keeps the page calm.
  if (pinned) {
    const r = await supabase.from("goals").update({ pinned: false }).eq("pinned", true).neq("id", id);
    if (r.error) throw new Error(r.error.message);
  }
  const { error } = await supabase.from("goals").update({ pinned }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addGoalProgress(v: { id: string; amount: number; note?: string; date?: string }, advanced: boolean) {
  const { error } = advanced
    ? await createClient().rpc("log_goal_progress", {
        p_goal: v.id,
        p_amount: v.amount,
        p_note: v.note ?? null,
        p_date: v.date ?? null,
      })
    : await createClient().rpc("add_goal_progress", { p_goal: v.id, p_amount: v.amount });
  if (error) throw new Error(error.message);
}

export async function deleteGoalLog(id: string) {
  const { error } = await createClient().rpc("delete_goal_log", { p_log: id });
  if (error) throw new Error(error.message);
}

export async function addMilestone(goalId: string, title: string) {
  const { error } = await createClient().from("goal_milestones").insert({ goal_id: goalId, title: title.trim() });
  if (error) throw new Error(error.message);
}

export async function toggleMilestone(id: string, done: boolean) {
  const { error } = await createClient()
    .from("goal_milestones")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteMilestone(id: string) {
  const { error } = await createClient().from("goal_milestones").delete().eq("id", id);
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
