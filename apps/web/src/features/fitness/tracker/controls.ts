"use client";

import { activity, type ActivityId } from "./activities";
import { finish, liveStore, movingSeconds, newWorkout, type FinishedWorkout, type LiveGoal } from "./live-store";
import {
  buzz,
  clearWorkoutNotification,
  holdWakeLock,
  releaseWakeLock,
  requestMotionPermission,
  showWorkoutNotification,
} from "./sensors";

/** Starts a workout. Call from a tap: iOS only grants motion access to one. */
export async function startWorkout(
  id: ActivityId,
  date: string,
  goal: LiveGoal,
  body: { weightKg: number; heightCm: number },
) {
  const def = activity(id);
  if (def.steps) await requestMotionPermission();
  liveStore.set(newWorkout(id, date, goal, body));
  buzz(60);
  void holdWakeLock();
  void showWorkoutNotification(def.label);
}

export function pauseWorkout() {
  liveStore.update((w) => (w.status === "running" ? { ...w, status: "paused", pausedAt: Date.now(), speedMs: null } : w));
  buzz([40, 60, 40]);
}

export function resumeWorkout() {
  liveStore.update((w) => {
    if (w.status !== "paused" || !w.pausedAt) return w;
    const now = Date.now();
    // The GPS fix from before the pause would turn the gap into a straight line.
    return { ...w, status: "running", pausedTotalMs: w.pausedTotalMs + (now - w.pausedAt), pausedAt: null, lastTickAt: now, lastFix: null };
  });
  buzz(60);
}

export function lapWorkout() {
  liveStore.update((w) => ({ ...w, laps: [...w.laps, Math.round(movingSeconds(w))] }));
  buzz(30);
}

/** Stops the clock and returns the summary to review and save. */
export function stopWorkout(): FinishedWorkout | null {
  const w = liveStore.get();
  if (!w) return null;
  const summary = finish(w);
  liveStore.set(null);
  void releaseWakeLock();
  void clearWorkoutNotification();
  buzz([60, 80, 60]);
  return summary;
}
