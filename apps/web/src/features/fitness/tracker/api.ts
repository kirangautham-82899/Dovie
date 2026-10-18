"use client";

import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";
import type { ActivityId } from "./activities";
import type { FinishedWorkout } from "./live-store";

export type FitnessTargets = {
  weight_kg: number | null;
  height_cm: number | null;
  step_goal: number;
  active_goal_min: number;
  move_goal_kcal: number;
};

export type Session = {
  id: string;
  activity: ActivityId;
  session_date: string;
  started_at: string;
  ended_at: string;
  duration_s: number;
  distance_m: number;
  steps: number;
  calories: number;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_m: number | null;
  effort: number | null;
  splits: number[] | null;
  note: string | null;
};

export type DayActivity = { activity_date: string; steps: number; distance_m: number; active_seconds: number };
export type BodyLog = { log_date: string; weight_kg: number };

export type FitnessOverview = {
  targets: FitnessTargets;
  sessions: Session[];
  days: DayActivity[];
  body: BodyLog[];
};

const SESSION_COLUMNS =
  "id,activity,session_date,started_at,ended_at,duration_s,distance_m,steps,calories,avg_hr,max_hr,elevation_gain_m,effort,splits,note";

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

const num = (v: unknown) => Number(v ?? 0);
const numOrNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** Targets, the last 120 days of workouts, 35 days of step totals and 6 months of weight. */
export async function fetchFitnessOverview(today: string): Promise<FitnessOverview> {
  const supabase = createClient();
  const [profile, sessions, days, body] = await Promise.all([
    supabase.from("profiles").select("weight_kg,height_cm,step_goal,active_goal_min,move_goal_kcal").single(),
    supabase
      .from("fitness_sessions")
      .select(SESSION_COLUMNS)
      .gte("session_date", addDays(today, -120))
      .order("started_at", { ascending: false })
      .limit(300),
    supabase
      .from("daily_activity")
      .select("activity_date,steps,distance_m,active_seconds")
      .gte("activity_date", addDays(today, -34)),
    supabase.from("body_logs").select("log_date,weight_kg").gte("log_date", addDays(today, -180)).order("log_date"),
  ]);
  const p = check(profile);
  return {
    targets: {
      weight_kg: numOrNull(p.weight_kg),
      height_cm: numOrNull(p.height_cm),
      step_goal: num(p.step_goal),
      active_goal_min: num(p.active_goal_min),
      move_goal_kcal: num(p.move_goal_kcal),
    },
    sessions: check(sessions).map((s) => ({
      ...s,
      activity: s.activity as ActivityId,
      distance_m: num(s.distance_m),
      elevation_gain_m: numOrNull(s.elevation_gain_m),
      splits: (s.splits as number[] | null) ?? null,
    })),
    days: check(days).map((d) => ({ ...d, distance_m: num(d.distance_m) })),
    body: check(body).map((b) => ({ log_date: b.log_date, weight_kg: num(b.weight_kg) })),
  };
}

export async function fetchRoute(id: string): Promise<[number, number][]> {
  const r = await createClient().from("fitness_sessions").select("route").eq("id", id).single();
  return (check(r).route as [number, number][] | null) ?? [];
}

export type SessionExtras = { effort: number | null; note: string };

export async function saveSession(w: FinishedWorkout, extras: SessionExtras) {
  check(
    await createClient()
      .from("fitness_sessions")
      .insert({
        activity: w.activity,
        session_date: w.date,
        started_at: new Date(w.startedAt).toISOString(),
        ended_at: new Date(w.endedAt).toISOString(),
        duration_s: w.durationS,
        distance_m: w.distanceM,
        steps: w.steps,
        calories: w.calories,
        avg_hr: w.avgHr,
        max_hr: w.maxHr,
        elevation_gain_m: w.elevGainM > 0 ? w.elevGainM : null,
        effort: extras.effort,
        route: w.route.length >= 2 ? w.route.map(([a, b]) => [round5(a), round5(b)]) : null,
        splits: w.splits.length ? w.splits : null,
        note: extras.note.trim() || null,
      }),
  );
}

// ~1 m precision is plenty for a route sketch and keeps rows small.
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

export async function deleteSession(id: string) {
  check(await createClient().from("fitness_sessions").delete().eq("id", id));
}

export async function updateTargets(profileId: string, values: Partial<FitnessTargets>) {
  check(await createClient().from("profiles").update(values).eq("id", profileId));
}

/** One weight per day; the latest also becomes the profile weight for calorie maths. */
export async function logWeight(profileId: string, date: string, kg: number) {
  const supabase = createClient();
  check(await supabase.from("body_logs").upsert({ log_date: date, weight_kg: kg }, { onConflict: "user_id,log_date" }));
  check(await supabase.from("profiles").update({ weight_kg: kg }).eq("id", profileId));
}

export async function addDailyActivity(date: string, steps: number, distanceM: number, activeSeconds: number) {
  check(
    await createClient().rpc("add_daily_activity", {
      p_date: date,
      p_steps: steps,
      p_distance_m: Math.round(distanceM * 10) / 10,
      p_active_seconds: activeSeconds,
    }),
  );
}

// ---------- outbox ----------
// A finished workout that couldn't be saved (offline, signed out mid-run) waits
// here and is retried the next time Dovie opens. Nothing recorded is lost.

const OUTBOX_KEY = "dovie-fit-outbox";
type Pending = { workout: FinishedWorkout; extras: SessionExtras };

function readOutbox(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]") as Pending[];
  } catch {
    return [];
  }
}

function writeOutbox(items: Pending[]) {
  try {
    if (items.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
    else localStorage.removeItem(OUTBOX_KEY);
  } catch {
    // Nothing more we can do without storage.
  }
}

export function queueSession(workout: FinishedWorkout, extras: SessionExtras) {
  writeOutbox([...readOutbox(), { workout, extras }]);
}

export function outboxSize() {
  return readOutbox().length;
}

/** Saves queued workouts; returns how many were saved. */
export async function flushOutbox(): Promise<number> {
  const items = readOutbox();
  if (!items.length) return 0;
  const left: Pending[] = [];
  let saved = 0;
  for (const item of items) {
    try {
      await saveSession(item.workout, item.extras);
      saved++;
    } catch {
      left.push(item);
    }
  }
  writeOutbox(left);
  return saved;
}
