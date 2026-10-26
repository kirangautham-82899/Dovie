import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";

export type MindLog = { log_date: string; stress: number | null; feelings: string[]; note: string | null };

export const FEELINGS = ["Calm", "Happy", "Grateful", "Hopeful", "Content", "Tired", "Anxious", "Stressed", "Sad", "Lonely", "Angry", "Overwhelmed"] as const;

export const STRESS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
] as const;

/** The last two weeks, enough for the week strip and for today's saved check-in. */
export async function fetchMind(today: string): Promise<MindLog[]> {
  const { data, error } = await createClient()
    .from("mind_logs")
    .select("log_date,stress,feelings,note")
    .gte("log_date", addDays(today, -13))
    .order("log_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MindLog[];
}

export const isEmptyMind = (v: MindLog) => v.stress === null && v.feelings.length === 0 && !v.note;

/** Saves a day's check-in. A day with nothing in it is removed. */
export async function saveMind(v: MindLog) {
  const supabase = createClient();
  const { error } = isEmptyMind(v)
    ? await supabase.from("mind_logs").delete().eq("log_date", v.log_date)
    : await supabase.from("mind_logs").upsert(v, { onConflict: "user_id,log_date" });
  if (error) throw new Error(error.message);
}
