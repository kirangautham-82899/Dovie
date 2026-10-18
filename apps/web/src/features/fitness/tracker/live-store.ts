"use client";

// The workout in progress lives in this small store and is mirrored to
// localStorage on every change. Time is kept as timestamps, never as a ticking
// counter, so if the tab is closed, the phone sleeps or the browser kills the
// page, reopening Dovie picks the workout up with the right elapsed time.

import { useSyncExternalStore } from "react";
import type { ActivityId } from "./activities";

export type LiveGoal = { kind: "time"; seconds: number } | { kind: "distance"; metres: number } | null;

export type LiveWorkout = {
  id: string;
  activity: ActivityId;
  /** The local date the workout started on (YYYY-MM-DD). */
  date: string;
  startedAt: number;
  status: "running" | "paused";
  pausedAt: number | null;
  pausedTotalMs: number;
  /** Last time calories were accrued, so a gap (app closed) is still counted. */
  lastTickAt: number;
  distanceM: number;
  steps: number;
  calories: number;
  elevGainM: number;
  lastAlt: number | null;
  route: [number, number][];
  lastFix: { lat: number; lng: number; t: number } | null;
  /** Current speed from GPS (m/s), or null without a recent fix. */
  speedMs: number | null;
  gpsAccuracy: number | null;
  /** Moving seconds at which each full km was reached. */
  kmMarks: number[];
  /** Moving seconds at each lap press. */
  laps: number[];
  hrNow: number | null;
  hrSum: number;
  hrCount: number;
  hrMax: number;
  /** Recent step timestamps for cadence (steps per minute). */
  recentSteps: number[];
  goal: LiveGoal;
  goalReached: boolean;
  /** Body numbers captured at the start, for calories and stride length. */
  weightKg: number;
  heightCm: number;
};

export type FinishedWorkout = {
  activity: ActivityId;
  date: string;
  startedAt: number;
  endedAt: number;
  durationS: number;
  distanceM: number;
  steps: number;
  calories: number;
  elevGainM: number;
  avgHr: number | null;
  maxHr: number | null;
  route: [number, number][];
  splits: number[];
};

const LIVE_KEY = "dovie-fit-live";

let current: LiveWorkout | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    current = raw ? (JSON.parse(raw) as LiveWorkout) : null;
  } catch {
    current = null;
  }
}

function persist() {
  try {
    if (current) localStorage.setItem(LIVE_KEY, JSON.stringify(current));
    else localStorage.removeItem(LIVE_KEY);
  } catch {
    // Storage full or blocked: the workout still runs for this visit.
  }
}

function emit() {
  persist();
  for (const l of listeners) l();
}

export const liveStore = {
  get(): LiveWorkout | null {
    load();
    return current;
  },
  set(next: LiveWorkout | null) {
    load();
    current = next;
    emit();
  },
  update(fn: (w: LiveWorkout) => LiveWorkout) {
    load();
    if (!current) return;
    current = fn(current);
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    // Another tab or window changed the workout.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LIVE_KEY) return;
      try {
        current = e.newValue ? (JSON.parse(e.newValue) as LiveWorkout) : null;
      } catch {
        current = null;
      }
      l();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  },
};

export function useLiveWorkout(): LiveWorkout | null {
  return useSyncExternalStore(liveStore.subscribe, liveStore.get, () => null);
}

/** Moving time in seconds, excluding pauses. */
export function movingSeconds(w: LiveWorkout, now = Date.now()): number {
  const end = w.status === "paused" && w.pausedAt ? w.pausedAt : now;
  return Math.max(0, (end - w.startedAt - w.pausedTotalMs) / 1000);
}

export function newWorkout(
  activity: ActivityId,
  date: string,
  goal: LiveGoal,
  body: { weightKg: number; heightCm: number },
): LiveWorkout {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    activity,
    date,
    startedAt: now,
    status: "running",
    pausedAt: null,
    pausedTotalMs: 0,
    lastTickAt: now,
    distanceM: 0,
    steps: 0,
    calories: 0,
    elevGainM: 0,
    lastAlt: null,
    route: [],
    lastFix: null,
    speedMs: null,
    gpsAccuracy: null,
    kmMarks: [],
    laps: [],
    hrNow: null,
    hrSum: 0,
    hrCount: 0,
    hrMax: 0,
    recentSteps: [],
    goal,
    goalReached: false,
    ...body,
  };
}

/** Seconds per km for each completed kilometre. */
export function splitsOf(kmMarks: number[]): number[] {
  return kmMarks.map((t, i) => Math.round(t - (i === 0 ? 0 : kmMarks[i - 1])));
}

export function finish(w: LiveWorkout, now = Date.now()): FinishedWorkout {
  return {
    activity: w.activity,
    date: w.date,
    startedAt: w.startedAt,
    endedAt: w.status === "paused" && w.pausedAt ? w.pausedAt : now,
    durationS: Math.max(1, Math.round(movingSeconds(w, now))),
    distanceM: Math.round(w.distanceM * 10) / 10,
    steps: w.steps,
    calories: Math.round(w.calories),
    elevGainM: Math.round(w.elevGainM * 10) / 10,
    avgHr: w.hrCount > 0 ? Math.round(w.hrSum / w.hrCount) : null,
    maxHr: w.hrMax > 0 ? w.hrMax : null,
    route: w.route,
    splits: splitsOf(w.kmMarks),
  };
}
