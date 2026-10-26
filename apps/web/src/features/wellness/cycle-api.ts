import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";
import type { CycleLog } from "./cycle";

/** A year of logs is plenty to work out a typical cycle. */
export async function fetchCycle(today: string): Promise<CycleLog[]> {
  const { data, error } = await createClient()
    .from("period_logs")
    .select("log_date,flow,symptoms")
    .gte("log_date", addDays(today, -365))
    .order("log_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CycleLog[];
}

/** Sets a day's flow and symptoms. A day with neither is removed. */
export async function saveCycleDay(v: CycleLog) {
  const supabase = createClient();
  const { error } =
    v.flow === null && v.symptoms.length === 0
      ? await supabase.from("period_logs").delete().eq("log_date", v.log_date)
      : await supabase.from("period_logs").upsert(v, { onConflict: "user_id,log_date" });
  if (error) throw new Error(error.message);
}
