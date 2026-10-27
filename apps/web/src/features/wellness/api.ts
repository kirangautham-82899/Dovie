import { createClient } from "@/lib/supabase/client";
import { upsertTodayCheckin, type CheckinFields } from "@/features/checkin/api";

export type WellnessDay = {
  sleep_hours: number | null;
  water_glasses: number;
  energy: number | null;
  mood: number | null;
  focus_minutes: number;
  movement_minutes: number;
};

export async function fetchWellness(today: string): Promise<WellnessDay> {
  const supabase = createClient();
  const [checkin, focus, movement] = await Promise.all([
    supabase.from("checkins").select("sleep_hours,water_glasses,energy,mood").eq("checkin_date", today).maybeSingle(),
    supabase.from("focus_sessions").select("minutes").eq("session_date", today),
    supabase.from("workout_logs").select("value").eq("log_date", today).is("goal_id", null),
  ]);
  if (checkin.error) throw new Error(checkin.error.message);
  if (focus.error) throw new Error(focus.error.message);
  if (movement.error) throw new Error(movement.error.message);
  return {
    sleep_hours: checkin.data?.sleep_hours === null || checkin.data?.sleep_hours === undefined ? null : Number(checkin.data.sleep_hours),
    water_glasses: checkin.data?.water_glasses ?? 0,
    energy: checkin.data?.energy ?? null,
    mood: checkin.data?.mood ?? null,
    focus_minutes: (focus.data ?? []).reduce((s, f) => s + f.minutes, 0),
    movement_minutes: (movement.data ?? []).reduce((s, m) => s + Number(m.value ?? 0), 0),
  };
}

export function saveWellness(today: string, values: CheckinFields) {
  return upsertTodayCheckin(today, values);
}

export async function addFocusSession(today: string, minutes: number) {
  const { error } = await createClient().from("focus_sessions").insert({ session_date: today, minutes });
  if (error) throw new Error(error.message);
}

/** A free-form movement entry ("Walk", 20 min) that is not tied to a fitness goal. */
export async function logMovement(today: string, activity: string, minutes: number) {
  const { error } = await createClient()
    .from("workout_logs")
    .insert({ log_date: today, activity: activity.trim(), value: minutes });
  if (error) throw new Error(error.message);
}

export const TEMPLATES = {
  student: {
    label: "Student",
    blurb: "Study in small pieces, with breaks that count.",
    tasks: ["Review one class note", "Plan a study break"],
    habits: ["Pack a snack", "Take a screen break"],
  },
  gym: {
    label: "Gym beginner",
    blurb: "Gentle movement and noticing how your body feels.",
    tasks: ["Pick a movement that feels okay", "Set out comfortable clothes"],
    habits: ["Notice how your body feels", "Drink a glass of water"],
  },
  office: {
    label: "9-to-5",
    blurb: "One clear priority and a workday that ends kindly.",
    tasks: ["Choose one work priority", "Make room for a proper lunch"],
    habits: ["Step away from your screen", "Close the workday gently"],
  },
} as const;

export type TemplateId = keyof typeof TEMPLATES;

/**
 * Adds a template's starter tasks (for today) and habits. Everything is editable afterwards.
 * Anything already there is skipped, so applying a template twice (in onboarding and again
 * from Wellness, say) never leaves duplicates.
 */
export async function applyTemplate(id: TemplateId, today: string) {
  const supabase = createClient();
  const t = TEMPLATES[id];
  const [haveTasks, haveHabits] = await Promise.all([
    supabase.from("tasks").select("title").eq("due_date", today).is("deleted_at", null),
    supabase.from("habits").select("title").is("deleted_at", null),
  ]);
  if (haveTasks.error) throw new Error(haveTasks.error.message);
  if (haveHabits.error) throw new Error(haveHabits.error.message);
  const key = (s: string) => s.trim().toLowerCase();
  const taskTitles = new Set(haveTasks.data.map((r) => key(r.title)));
  const habitTitles = new Set(haveHabits.data.map((r) => key(r.title)));
  const newTasks = t.tasks.filter((title) => !taskTitles.has(key(title)));
  const newHabits = t.habits.filter((title) => !habitTitles.has(key(title)));

  const [tasks, habits] = await Promise.all([
    newTasks.length ? supabase.from("tasks").insert(newTasks.map((title) => ({ title, due_date: today }))) : { error: null },
    newHabits.length ? supabase.from("habits").insert(newHabits.map((title) => ({ title }))) : { error: null },
  ]);
  if (tasks.error) throw new Error(tasks.error.message);
  if (habits.error) throw new Error(habits.error.message);
}
