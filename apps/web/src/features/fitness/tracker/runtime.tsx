"use client";

// Mounted once in the signed-in layout, so a workout keeps recording while you
// move between Dovie's screens. It owns every sensor: the clock, GPS, the step
// counter, the wake lock, and the all-day step counter when that is switched on.

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Maximize2 } from "lucide-react";
import { useProfile } from "@/features/settings/use-profile";
import { todayInTimezone } from "@/lib/dates";
import { activity, showsPace } from "./activities";
import { addDailyActivity, flushOutbox } from "./api";
import {
  DEFAULT_HEIGHT_CM,
  StepDetector,
  formatDuration,
  formatKm,
  formatPace,
  haversine,
  kcal,
  maxSpeed,
  metFor,
  paceOf,
  strideMetres,
  thinRoute,
} from "./engine";
import { liveStore, movingSeconds, useLiveWorkout, type LiveWorkout } from "./live-store";
import { buzz, holdWakeLock, releaseWakeLock, sensorStore } from "./sensors";
import { createStore } from "@/lib/local-store";

// ---------- small shared stores ----------

export type StepCounterSettings = { enabled: boolean; heightCm: number };
const counterStore = createStore<StepCounterSettings>(
  () => ({ enabled: false, heightCm: DEFAULT_HEIGHT_CM }),
  "dovie-fit-counter",
);
const COUNTER_SERVER = { enabled: false, heightCm: DEFAULT_HEIGHT_CM };

export function useStepCounter() {
  return useSyncExternalStore(counterStore.subscribe, counterStore.get, () => COUNTER_SERVER);
}
export const setStepCounter = (s: StepCounterSettings) => counterStore.set(s);

/** All-day steps counted on this device that haven't reached the server yet. */
type DayBuffer = { date: string; steps: number; distanceM: number; activeSeconds: number; lastStepAt: number };
const EMPTY_BUFFER: DayBuffer = { date: "", steps: 0, distanceM: 0, activeSeconds: 0, lastStepAt: 0 };
const bufferStore = createStore<DayBuffer>(() => ({ ...EMPTY_BUFFER }), "dovie-fit-steps");

export function usePendingSteps(date: string) {
  const buf = useSyncExternalStore(bufferStore.subscribe, bufferStore.get, () => EMPTY_BUFFER);
  return buf.date === date ? buf.steps : 0;
}

/** Whether the full-screen live view is tucked away into the floating pill. */
const minimizedStore = createStore<boolean>(() => false);
export function useLiveMinimized() {
  return useSyncExternalStore(minimizedStore.subscribe, minimizedStore.get, () => false);
}
export const setLiveMinimized = (v: boolean) => minimizedStore.set(v);

// ---------- pure updates ----------

function addDistance(w: LiveWorkout, d: number, now: number): LiveWorkout {
  const distanceM = w.distanceM + d;
  const kmMarks = [...w.kmMarks];
  while (Math.floor(distanceM / 1000) > kmMarks.length) kmMarks.push(Math.round(movingSeconds(w, now)));
  if (kmMarks.length > w.kmMarks.length) buzz([80, 60, 80]);
  return { ...w, distanceM, kmMarks };
}

function goalMet(w: LiveWorkout, now: number) {
  if (!w.goal) return false;
  return w.goal.kind === "time" ? movingSeconds(w, now) >= w.goal.seconds : w.distanceM >= w.goal.metres;
}

/** Runs every second (and after any gap): calories, cadence window, goal check. */
function accrue(w: LiveWorkout, now: number): LiveWorkout {
  if (w.status !== "running") return { ...w, lastTickAt: now };
  const dt = (now - w.lastTickAt) / 1000;
  if (dt <= 0) return w;
  const def = activity(w.activity);
  // After a long gap (app closed, phone asleep) speed is unknown, so the base effort is used.
  const fresh = w.lastFix && now - w.lastFix.t < 10_000 && dt < 15;
  const speed = fresh ? w.speedMs : null;
  let next: LiveWorkout = {
    ...w,
    lastTickAt: now,
    speedMs: speed,
    calories: w.calories + kcal(metFor(w.activity, def.met, speed), w.weightKg, dt),
    recentSteps: w.recentSteps.length && w.recentSteps[0] < now - 60_000 ? w.recentSteps.filter((t) => t >= now - 60_000) : w.recentSteps,
  };
  if (!next.goalReached && goalMet(next, now)) {
    next = { ...next, goalReached: true };
    buzz([200, 100, 200, 100, 400]);
  }
  return next;
}

type Fix = { lat: number; lng: number; accuracy: number; altitude: number | null; speed: number | null; t: number };

function applyFix(w: LiveWorkout, f: Fix): LiveWorkout {
  if (w.status !== "running") return { ...w, gpsAccuracy: f.accuracy };
  if (f.accuracy > 40) return { ...w, gpsAccuracy: f.accuracy };
  const point: [number, number] = [f.lat, f.lng];
  if (!w.lastFix) {
    return {
      ...w,
      gpsAccuracy: f.accuracy,
      lastFix: { lat: f.lat, lng: f.lng, t: f.t },
      lastAlt: f.altitude ?? w.lastAlt,
      route: [...w.route, point],
    };
  }
  const d = haversine(w.lastFix.lat, w.lastFix.lng, f.lat, f.lng);
  const dt = (f.t - w.lastFix.t) / 1000;
  if (dt <= 0) return w;
  const v = d / dt;
  // A jump faster than the activity allows is a bad fix.
  if (v > maxSpeed(w.activity)) return { ...w, gpsAccuracy: f.accuracy };
  // Standing still: GPS wanders a few metres, which shouldn't add distance.
  if (d < Math.max(4, f.accuracy * 0.3)) {
    return { ...w, gpsAccuracy: f.accuracy, speedMs: f.speed ?? (dt > 5 ? 0 : w.speedMs) };
  }

  let next = addDistance(w, d, f.t);
  const prevSpeed = w.speedMs ?? v;
  next.speedMs = f.speed !== null && f.speed >= 0 ? f.speed : 0.6 * prevSpeed + 0.4 * v;
  next.gpsAccuracy = f.accuracy;
  next.lastFix = { lat: f.lat, lng: f.lng, t: f.t };

  const last = w.route[w.route.length - 1];
  if (!last || haversine(last[0], last[1], f.lat, f.lng) >= 8) next.route = thinRoute([...w.route, point]);

  if (f.altitude !== null) {
    if (w.lastAlt === null) next.lastAlt = f.altitude;
    else if (f.altitude - w.lastAlt > 3) {
      next = { ...next, elevGainM: w.elevGainM + (f.altitude - w.lastAlt), lastAlt: f.altitude };
    } else if (f.altitude - w.lastAlt < -3) next.lastAlt = f.altitude;
  }
  return next;
}

function applySteps(w: LiveWorkout, n: number, now: number): LiveWorkout {
  if (w.status !== "running") return w;
  const stamps = Array.from({ length: n }, () => now);
  const next = { ...w, steps: w.steps + n, recentSteps: [...w.recentSteps, ...stamps].slice(-240) };
  // Indoors (treadmill, no GPS signal) distance comes from stride length instead.
  const gpsLive = activity(w.activity).gps && w.lastFix && now - w.lastFix.t < 15_000;
  if (gpsLive) return next;
  return addDistance(next, n * strideMetres(w.heightCm, w.activity === "run"), now);
}

function addDaySteps(date: string, n: number, heightCm: number, now: number) {
  const cur = bufferStore.get();
  const base = cur.date === date ? cur : { ...EMPTY_BUFFER, date };
  const gap = now - base.lastStepAt;
  bufferStore.set({
    date,
    steps: base.steps + n,
    distanceM: base.distanceM + n * strideMetres(heightCm, false),
    activeSeconds: base.activeSeconds + (base.lastStepAt && gap < 5000 ? gap / 1000 : 0),
    lastStepAt: now,
  });
}

let flushing = false;
async function flushDaySteps(): Promise<boolean> {
  const buf = bufferStore.get();
  if (flushing || !buf.date || buf.steps <= 0) return false;
  flushing = true;
  const sent = { ...buf };
  try {
    await addDailyActivity(sent.date, sent.steps, sent.distanceM, Math.round(sent.activeSeconds));
    const now = bufferStore.get();
    // Keep anything counted while the request was in flight.
    bufferStore.set(
      now.date === sent.date
        ? {
            ...now,
            steps: Math.max(0, now.steps - sent.steps),
            distanceM: Math.max(0, now.distanceM - sent.distanceM),
            activeSeconds: Math.max(0, now.activeSeconds - sent.activeSeconds),
          }
        : now,
    );
    return true;
  } catch {
    return false; // Retried on the next flush.
  } finally {
    flushing = false;
  }
}

// ---------- the runtime ----------

export function FitnessRuntime() {
  const live = useLiveWorkout();
  const profile = useProfile().query.data;
  const counter = useStepCounter();
  const qc = useQueryClient();
  const today = profile ? todayInTimezone(profile.timezone) : null;

  const running = live?.status === "running";
  const hasLive = live !== null;
  const def = live ? activity(live.activity) : null;
  const wantWorkoutSteps = running && !!def?.steps;
  const wantDaySteps = counter.enabled && !hasLive && !!today;
  const wantGps = running && !!def?.gps;

  // Keep the latest values handy for listeners without re-subscribing.
  const ctx = useRef({ today, heightCm: counter.heightCm, wantWorkoutSteps });
  useEffect(() => {
    ctx.current = { today, heightCm: counter.heightCm, wantWorkoutSteps };
  });

  // Retry anything recorded but not yet saved.
  const signedIn = !!profile;
  useEffect(() => {
    if (!signedIn) return;
    const refresh = (changed: unknown) => {
      if (changed) void qc.invalidateQueries({ queryKey: ["fitness-tracker"] });
    };
    void flushOutbox().then(refresh);
    void flushDaySteps().then(refresh);
  }, [signedIn, qc]);

  // The clock. Time is derived from timestamps, so this only refreshes the screen.
  useEffect(() => {
    if (!hasLive) return;
    const tick = () => liveStore.update((w) => accrue(w, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hasLive]);

  // Screen on while a workout is live; re-taken when you come back to the tab.
  useEffect(() => {
    if (!hasLive) return;
    void holdWakeLock();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void holdWakeLock();
        liveStore.update((w) => accrue(w, Date.now()));
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void releaseWakeLock();
    };
  }, [hasLive]);

  // GPS.
  useEffect(() => {
    if (!wantGps) {
      sensorStore.set({ gps: "off" });
      return;
    }
    if (!("geolocation" in navigator)) {
      sensorStore.set({ gps: "unavailable" });
      return;
    }
    sensorStore.set({ gps: "searching" });
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;
        sensorStore.set({ gps: c.accuracy <= 25 ? "ok" : "weak" });
        liveStore.update((w) =>
          applyFix(w, {
            lat: c.latitude,
            lng: c.longitude,
            accuracy: c.accuracy,
            altitude: c.altitude,
            speed: c.speed,
            t: pos.timestamp || Date.now(),
          }),
        );
      },
      (err) => sensorStore.set({ gps: err.code === err.PERMISSION_DENIED ? "denied" : "searching" }),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [wantGps]);

  // Step counter: feeds the workout when one is running, otherwise the day.
  const wantMotion = wantWorkoutSteps || wantDaySteps;
  useEffect(() => {
    if (!wantMotion) {
      sensorStore.set({ motion: "off" });
      return;
    }
    if (!("DeviceMotionEvent" in window)) {
      sensorStore.set({ motion: "unavailable" });
      return;
    }
    const detector = new StepDetector();
    let seen = false;
    if (sensorStore.get().motion !== "denied") sensorStore.set({ motion: "waiting" });
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      if (!seen) {
        seen = true;
        sensorStore.set({ motion: "ok" });
      }
      const n = detector.sample(a.x, a.y, a.z, e.timeStamp || performance.now());
      if (!n) return;
      const now = Date.now();
      const { today: day, heightCm, wantWorkoutSteps: toWorkout } = ctx.current;
      if (toWorkout) liveStore.update((w) => applySteps(w, n, now));
      else if (day) addDaySteps(day, n, heightCm, now);
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [wantMotion]);

  // All-day steps reach the server in small batches, and before the page hides.
  useEffect(() => {
    if (!wantDaySteps) return;
    const flush = () =>
      void flushDaySteps().then((ok) => {
        if (ok) void qc.invalidateQueries({ queryKey: ["fitness-tracker"] });
      });
    const id = setInterval(flush, 30_000);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [wantDaySteps, qc]);

  return <LivePill />;
}

/** A floating reminder of the running workout on every other screen. */
function LivePill() {
  const live = useLiveWorkout();
  const pathname = usePathname();
  const router = useRouter();
  const minimized = useLiveMinimized();
  if (!live || (pathname === "/fitness" && !minimized)) return null;
  const def = activity(live.activity);
  const Icon = def.icon;
  const secs = movingSeconds(live, live.lastTickAt);
  const pace = paceOf(live.distanceM, secs);
  return (
    <button
      type="button"
      onClick={() => {
        setLiveMinimized(false);
        if (pathname !== "/fitness") router.push("/fitness");
      }}
      style={{ "--act": def.hue } as React.CSSProperties}
      className="fit-pill animate-rise fixed right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-full py-2 pr-4 pl-2 text-left text-white shadow-xl lg:right-6 lg:bottom-6"
      aria-label={`Return to your ${def.label.toLowerCase()}`}
    >
      <span className="relative flex size-9 items-center justify-center rounded-full bg-white/20">
        {live.status === "running" && <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />}
        <Icon className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block font-mono text-lg font-semibold tabular-nums">{formatDuration(secs)}</span>
        <span className="block text-[0.68rem] opacity-90">
          {live.status === "paused" ? "Paused" : def.label}
          {live.distanceM >= 10 && ` · ${formatKm(live.distanceM)} km`}
          {showsPace(live.activity) && pace && ` · ${formatPace(pace)}/km`}
        </span>
      </span>
      <Maximize2 className="size-4 opacity-80" />
    </button>
  );
}
