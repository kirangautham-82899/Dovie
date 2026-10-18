"use client";

import { useState } from "react";
import {
  Bluetooth,
  ChevronDown,
  Flag,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  Mountain,
  Pause,
  Play,
  Route,
  Satellite,
  Smartphone,
  Square,
  Sun,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { activity, showsPace } from "./activities";
import { formatDuration, formatKm, formatPace, paceOf, routePath } from "./engine";
import { movingSeconds, splitsOf, type LiveWorkout } from "./live-store";
import { lapWorkout, pauseWorkout, resumeWorkout } from "./controls";
import { connectHeartRate, heartRateSupported, useSensors, type SensorStatus } from "./sensors";
import { setLiveMinimized } from "./runtime";

const MAX_HR = 190;
const ZONES = [
  { upTo: 0.6, label: "Easy" },
  { upTo: 0.7, label: "Fat burn" },
  { upTo: 0.8, label: "Cardio" },
  { upTo: 0.9, label: "Hard" },
  { upTo: Infinity, label: "Peak" },
];
const zoneOf = (bpm: number) => ZONES.findIndex((z) => bpm / MAX_HR < z.upTo);

function Chip({ ok, warn, icon: Icon, children }: { ok: boolean; warn?: boolean; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold",
        ok ? "bg-white/18 text-white" : warn ? "bg-amber-300/25 text-amber-100" : "bg-white/8 text-white/60",
      )}
    >
      <span className={cn("size-1.5 rounded-full", ok ? "bg-emerald-300" : warn ? "bg-amber-300" : "bg-white/40")} />
      <Icon className="size-3" />
      {children}
    </span>
  );
}

function SensorChips({ w, s }: { w: LiveWorkout; s: SensorStatus }) {
  const def = activity(w.activity);
  const gpsText: Record<SensorStatus["gps"], string> = {
    off: "GPS off",
    searching: "Finding GPS…",
    ok: `GPS ±${Math.round(w.gpsAccuracy ?? 0)} m`,
    weak: `Weak GPS ±${Math.round(w.gpsAccuracy ?? 0)} m`,
    denied: "Location blocked",
    unavailable: "No GPS",
  };
  const motionText: Record<SensorStatus["motion"], string> = {
    off: "Steps off",
    waiting: "Waiting for motion…",
    ok: "Counting steps",
    denied: "Motion blocked",
    unavailable: "No motion sensor",
  };
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {def.gps && (
        <Chip ok={s.gps === "ok"} warn={s.gps === "weak" || s.gps === "searching"} icon={Satellite}>
          {gpsText[s.gps]}
        </Chip>
      )}
      {def.steps && (
        <Chip ok={s.motion === "ok"} warn={s.motion === "waiting"} icon={Smartphone}>
          {motionText[s.motion]}
        </Chip>
      )}
      <Chip ok={s.wake} icon={Sun}>
        {s.wake ? "Screen stays on" : "Screen may sleep"}
      </Chip>
      {s.hr === "on" && (
        <Chip ok icon={HeartPulse}>
          {s.hrDevice}
        </Chip>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, unit, wide }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; unit?: string; wide?: boolean }) {
  return (
    <div className={cn("fit-live-glass rounded-2xl p-3.5", wide && "col-span-2")}>
      <p className="flex items-center gap-1.5 text-[0.62rem] font-bold tracking-[0.14em] text-white/65 uppercase">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1.5 font-mono text-2xl leading-none font-semibold tabular-nums sm:text-3xl">
        {value}
        {unit && <span className="ml-1 font-sans text-xs font-normal text-white/60">{unit}</span>}
      </p>
    </div>
  );
}

export function LiveView({ w, onFinish }: { w: LiveWorkout; onFinish: () => void }) {
  const s = useSensors();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const def = activity(w.activity);
  const Icon = def.icon;
  const secs = movingSeconds(w, w.lastTickAt);
  const paused = w.status === "paused";
  const avgPace = paceOf(w.distanceM, secs);
  const nowPace = w.speedMs && w.speedMs > 0.4 ? 1000 / w.speedMs : null;
  const cadence = w.recentSteps.length >= 8 ? Math.round((w.recentSteps.length / Math.max(10, Math.min(60, (w.lastTickAt - w.recentSteps[0]) / 1000))) * 60) : null;
  const splits = splitsOf(w.kmMarks);
  const path = routePath(w.route, 320, 140);
  const goalPct = !w.goal
    ? null
    : Math.min(1, w.goal.kind === "time" ? secs / w.goal.seconds : w.distanceM / w.goal.metres);
  const zone = w.hrNow ? zoneOf(w.hrNow) : -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${def.label} in progress`}
      style={{ "--act": def.hue } as React.CSSProperties}
      className="fit-live fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="mx-auto flex min-h-full max-w-xl flex-col gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setLiveMinimized(true)}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Minimise; the workout keeps recording"
          >
            <ChevronDown className="size-5" />
          </button>
          <p className="flex items-center gap-2 font-serif text-xl">
            <Icon className="size-5" /> {def.label}
          </p>
          <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", paused ? "bg-amber-300/25 text-amber-100" : "bg-red-500/25 text-red-100")}>
            <span className={cn("size-2 rounded-full", paused ? "bg-amber-300" : "animate-pulse bg-red-400")} />
            {paused ? "PAUSED" : "LIVE"}
          </span>
        </header>

        <SensorChips w={w} s={s} />

        <section className="py-2 text-center">
          <p className="text-[0.7rem] font-bold tracking-[0.2em] text-white/60 uppercase">Moving time</p>
          <p className={cn("font-mono text-[4.5rem] leading-none font-semibold tracking-tight tabular-nums sm:text-8xl", paused && "animate-pulse")}>
            {formatDuration(secs)}
          </p>
          {goalPct !== null && w.goal && (
            <div className="mx-auto mt-4 max-w-xs">
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${goalPct * 100}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-white/70">
                {w.goalReached
                  ? "Goal reached. Anything more is a bonus."
                  : w.goal.kind === "time"
                    ? `${formatDuration(Math.max(0, w.goal.seconds - secs))} to your ${Math.round(w.goal.seconds / 60)} min goal`
                    : `${formatKm(Math.max(0, w.goal.metres - w.distanceM))} km to your ${w.goal.metres / 1000} km goal`}
              </p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-2.5">
          {(def.gps || w.distanceM > 0) && <Metric icon={Route} label="Distance" value={formatKm(w.distanceM)} unit="km" />}
          {def.gps &&
            (showsPace(w.activity) ? (
              <Metric icon={Gauge} label="Pace now" value={formatPace(nowPace)} unit="/km" />
            ) : (
              <Metric icon={Gauge} label="Speed" value={w.speedMs ? (w.speedMs * 3.6).toFixed(1) : "–"} unit="km/h" />
            ))}
          {def.gps && showsPace(w.activity) && <Metric icon={Timer} label="Avg pace" value={formatPace(avgPace)} unit="/km" />}
          {def.steps && <Metric icon={Footprints} label="Steps" value={w.steps.toLocaleString("en-IN")} />}
          {def.steps && <Metric icon={Footprints} label="Cadence" value={cadence ?? "–"} unit="spm" />}
          <Metric icon={Flame} label="Calories" value={Math.round(w.calories)} unit="kcal" />
          {def.gps && <Metric icon={Mountain} label="Climb" value={Math.round(w.elevGainM)} unit="m" />}
          {w.hrNow ? (
            <Metric
              icon={HeartPulse}
              label={`Heart · ${ZONES[zone]?.label ?? ""}`}
              value={w.hrNow}
              unit={`bpm${w.hrCount ? ` · avg ${Math.round(w.hrSum / w.hrCount)}` : ""}`}
            />
          ) : (
            heartRateSupported() && (
              <button
                type="button"
                onClick={() => void connectHeartRate()}
                className="fit-live-glass flex items-center justify-center gap-2 rounded-2xl p-3.5 text-sm font-semibold text-white/85 hover:bg-white/15"
              >
                <Bluetooth className="size-4" />
                {s.hr === "connecting" ? "Connecting…" : "Connect heart-rate strap"}
              </button>
            )
          )}
        </section>

        {w.hrNow && (
          <div className="flex gap-1" aria-label="Heart-rate zone">
            {ZONES.map((z, i) => (
              <div key={z.label} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= zone ? "bg-white" : "bg-white/15")} />
            ))}
          </div>
        )}

        {path && (
          <section className="fit-live-glass rounded-2xl p-3">
            <p className="mb-1 text-[0.62rem] font-bold tracking-[0.14em] text-white/65 uppercase">Your route</p>
            <svg viewBox="0 0 320 140" className="h-36 w-full" aria-label="Route so far">
              <path d={path} fill="none" stroke="white" strokeOpacity={0.25} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
              <path d={path} fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </section>
        )}

        {(splits.length > 0 || w.laps.length > 0) && (
          <section className="fit-live-glass rounded-2xl p-3 text-sm">
            {splits.length > 0 && (
              <>
                <p className="mb-1.5 text-[0.62rem] font-bold tracking-[0.14em] text-white/65 uppercase">Kilometre splits</p>
                <ul className="grid grid-cols-3 gap-1.5 font-mono tabular-nums">
                  {splits.slice(-6).map((t, i, arr) => (
                    <li key={i} className="rounded-lg bg-white/8 px-2 py-1">
                      <span className="text-white/60">km {splits.length - arr.length + i + 1}</span> {formatPace(t)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {w.laps.length > 0 && (
              <p className="mt-2 text-white/75">
                {w.laps.length} lap{w.laps.length > 1 ? "s" : ""} · last at {formatDuration(w.laps[w.laps.length - 1])}
              </p>
            )}
          </section>
        )}

        <div className="mt-auto space-y-4 pt-2">
          {confirmEnd ? (
            <div className="fit-live-glass flex items-center justify-between gap-3 rounded-2xl p-3">
              <p className="text-sm font-semibold">Finish this {def.label.toLowerCase()}?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmEnd(false)} className="rounded-full bg-white/10 px-4 py-2 text-sm">
                  Keep going
                </button>
                <button type="button" onClick={onFinish} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black">
                  Finish
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={lapWorkout}
                disabled={paused}
                className="flex size-16 flex-col items-center justify-center rounded-full bg-white/12 text-[0.65rem] font-bold hover:bg-white/20 disabled:opacity-40"
              >
                <Flag className="size-5" /> LAP
              </button>
              <button
                type="button"
                onClick={paused ? resumeWorkout : pauseWorkout}
                aria-label={paused ? "Resume" : "Pause"}
                className="relative flex size-24 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform active:scale-95"
              >
                {!paused && <span className="absolute inset-0 animate-halo rounded-full border-2 border-white" />}
                {paused ? <Play className="size-10 fill-current" /> : <Pause className="size-10 fill-current" />}
              </button>
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                className="flex size-16 flex-col items-center justify-center rounded-full bg-white/12 text-[0.65rem] font-bold hover:bg-white/20"
              >
                <Square className="size-5 fill-current" /> END
              </button>
            </div>
          )}
          <p className="text-center text-[0.7rem] leading-relaxed text-white/55">
            Recording on every Dovie screen. If you close the app, time and calories keep counting;
            GPS and steps pick up again when you reopen it.
          </p>
        </div>
      </div>
    </div>
  );
}
