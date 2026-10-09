import { createClient } from "@/lib/supabase/client";

export type Habit = {
  id: string;
  title: string;
  streak: number;
  best: number;
  done_today: boolean;
  /** Dates (YYYY-MM-DD) with a log in the last 7 days, today included. */
  recent_dates: string[];
};

type Stat = Pick<Habit, "streak" | "best" | "done_today" | "recent_dates"> & { habit_uuid: string };

export async function fetchHabits(today: string): Promise<Habit[]> {
  const supabase = createClient();
  const [habits, stats] = await Promise.all([
    supabase
      .from("habits")
      .select("id,title,created_at")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase.rpc("habit_stats", { p_today: today }),
  ]);
  if (habits.error) throw new Error(habits.error.message);
  if (stats.error) throw new Error(stats.error.message);

  const byId = new Map((stats.data as Stat[]).map((s) => [s.habit_uuid, s]));
  return (habits.data ?? []).map((h) => {
    const s = byId.get(h.id);
    return {
      id: h.id,
      title: h.title,
      streak: s?.streak ?? 0,
      best: s?.best ?? 0,
      done_today: s?.done_today ?? false,
      recent_dates: s?.recent_dates ?? [],
    };
  });
}

export async function addHabit(title: string) {
  const { error } = await createClient().from("habits").insert({ title: title.trim() });
  if (error) throw new Error(error.message);
}

export async function renameHabit(id: string, title: string) {
  const { error } = await createClient().from("habits").update({ title: title.trim() }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Soft delete; the logs are kept so history is not lost. */
export async function deleteHabit(id: string) {
  const { error } = await createClient()
    .from("habits")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** One tap: log today, or remove today's log. Safe to call twice. */
export async function setHabitDone(id: string, today: string, done: boolean) {
  const supabase = createClient();
  const { error } = done
    ? await supabase
        .from("habit_logs")
        .upsert({ habit_id: id, log_date: today }, { onConflict: "habit_id,log_date", ignoreDuplicates: true })
    : await supabase.from("habit_logs").delete().eq("habit_id", id).eq("log_date", today);
  if (error) throw new Error(error.message);
}
