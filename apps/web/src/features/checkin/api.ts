import { createClient } from "@/lib/supabase/client";

export type Checkin = { mood: number | null; note: string | null; score: number | null };

export type BreakdownRow = { category: string; done: number; total: number; weight: number };

export type CheckinState = {
  /** Today's saved check-in, or null if the user has not checked in yet. */
  checkin: Checkin | null;
  /** The score as it would be right now. */
  liveScore: number | null;
  breakdown: BreakdownRow[];
};

export async function fetchCheckinState(today: string): Promise<CheckinState> {
  const supabase = createClient();
  const [checkin, score, breakdown] = await Promise.all([
    supabase.from("checkins").select("mood,note,score").eq("checkin_date", today).not("mood", "is", null).maybeSingle(),
    supabase.rpc("daily_score", { p_date: today }),
    supabase.rpc("score_breakdown", { p_date: today }),
  ]);
  if (checkin.error) throw new Error(checkin.error.message);
  if (score.error) throw new Error(score.error.message);
  if (breakdown.error) throw new Error(breakdown.error.message);

  return {
    checkin: checkin.data as Checkin | null,
    liveScore: score.data as number | null,
    breakdown: (breakdown.data as BreakdownRow[]).map((r) => ({
      category: r.category,
      done: Number(r.done),
      total: Number(r.total),
      weight: r.weight,
    })),
  };
}

/**
 * Saves today's check-in. The database computes the score; the client cannot
 * set it. Checking in again the same day updates mood, note and the score.
 */
export async function saveCheckin(today: string, mood: number, note: string) {
  await upsertTodayCheckin(today, { mood, note: note.trim() || null });
}

export type CheckinFields = {
  mood?: number | null;
  note?: string | null;
  energy?: number | null;
  water_glasses?: number;
  sleep_hours?: number | null;
};

/**
 * Writes fields on today's check-in row, creating it if needed. Wellness
 * (sleep, water, energy) and the evening check-in share this one daily row.
 */
export async function upsertTodayCheckin(today: string, values: CheckinFields) {
  const supabase = createClient();
  const updated = await supabase.from("checkins").update(values).eq("checkin_date", today).select("id");
  if (updated.error) throw new Error(updated.error.message);
  if (updated.data.length > 0) return;

  const { error } = await supabase.from("checkins").insert({ checkin_date: today, ...values });
  // A parallel save may have created the row first; retry as an update.
  if (error?.code === "23505") {
    const retry = await supabase.from("checkins").update(values).eq("checkin_date", today);
    if (retry.error) throw new Error(retry.error.message);
    return;
  }
  if (error) throw new Error(error.message);
}
