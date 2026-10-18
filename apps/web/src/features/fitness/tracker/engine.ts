// Pure tracking maths: no browser APIs here, so it is easy to test.

import type { ActivityId } from "./activities";

export const DEFAULT_WEIGHT_KG = 65;
export const DEFAULT_HEIGHT_CM = 165;

/** Great-circle distance in metres between two lat/lng points. */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Fastest believable speed per activity (m/s); faster GPS jumps are noise. */
export function maxSpeed(id: ActivityId): number {
  if (id === "cycle") return 25;
  if (id === "run" || id === "sport") return 11;
  return 7;
}

/**
 * Metabolic equivalent for the activity, from speed when it is known.
 * Fitted to the Compendium of Physical Activities for walking, running and cycling.
 */
export function metFor(id: ActivityId, baseMet: number, speedMs: number | null): number {
  if (speedMs === null || speedMs < 0.3) return baseMet;
  const kmh = speedMs * 3.6;
  if (id === "walk" || id === "hike") return clamp(0.75 * kmh + 0.5 + (id === "hike" ? 1.2 : 0), 2, 8);
  if (id === "run") return clamp(1.02 * kmh, 6, 20);
  if (id === "cycle") return clamp(0.4 * kmh, 3.5, 14);
  return baseMet;
}

/** Kilocalories burned over `seconds` at a given MET. */
export function kcal(met: number, weightKg: number, seconds: number): number {
  return (met * weightKg * seconds) / 3600;
}

/** Step length in metres from height; running strides are longer. */
export function strideMetres(heightCm: number, running: boolean): number {
  return (heightCm * (running ? 0.65 : 0.415)) / 100;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** 75 -> "1:15", 3725 -> "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** Seconds per km as "5:42", or "–" when there is no meaningful pace. */
export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 3600) return "–";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatKm(metres: number): string {
  const km = metres / 1000;
  return km >= 100 ? km.toFixed(0) : km.toFixed(2);
}

export function paceOf(distanceM: number, seconds: number): number | null {
  return distanceM >= 50 ? seconds / (distanceM / 1000) : null;
}

/**
 * Turns raw accelerometer samples into steps. Gravity is removed with a slow
 * low-pass filter, the rest is smoothed, and a step is a peak above a
 * threshold at a human cadence. Steps are only counted once four arrive in a
 * steady rhythm, so picking the phone up or shaking it doesn't count.
 */
export class StepDetector {
  private gravity = 9.81;
  private smooth = 0;
  private prev = 0;
  private rising = false;
  private lastPeakAt = 0;
  private pending = 0;
  private walking = false;

  /** Feed one sample (m/s², ms timestamp). Returns how many steps to add (0, 1 or 4). */
  sample(x: number, y: number, z: number, t: number): number {
    const mag = Math.sqrt(x * x + y * y + z * z);
    this.gravity = 0.9 * this.gravity + 0.1 * mag;
    this.smooth = 0.75 * this.smooth + 0.25 * (mag - this.gravity);

    let steps = 0;
    const falling = this.smooth < this.prev;
    if (this.rising && falling && this.prev > 1.1) {
      const gap = t - this.lastPeakAt;
      if (gap >= 260) {
        if (gap > 2000) {
          this.walking = false;
          this.pending = 0;
        }
        this.lastPeakAt = t;
        if (this.walking) {
          steps = 1;
        } else if (++this.pending >= 4) {
          this.walking = true;
          steps = this.pending;
          this.pending = 0;
        }
      }
    }
    this.rising = this.smooth > this.prev;
    this.prev = this.smooth;
    return steps;
  }
}

/** Keeps a route under `max` points by dropping every other point when full. */
export function thinRoute(route: [number, number][], max = 1800): [number, number][] {
  if (route.length <= max) return route;
  const last = route[route.length - 1];
  const thinned = route.filter((_, i) => i % 2 === 0);
  if (thinned[thinned.length - 1] !== last) thinned.push(last);
  return thinned;
}

/** Projects a route into an SVG path inside a width x height box (keeps aspect ratio). */
export function routePath(route: [number, number][], width: number, height: number, pad = 6): string {
  if (route.length < 2) return "";
  const lats = route.map((p) => p[0]);
  const lngs = route.map((p) => p[1]);
  const midLat = ((Math.min(...lats) + Math.max(...lats)) / 2) * (Math.PI / 180);
  // Longitude degrees shrink towards the poles.
  const xs = lngs.map((l) => l * Math.cos(midLat));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const span = Math.max(maxX - minX, maxY - minY, 1e-9);
  const scale = Math.min((width - pad * 2) / span, (height - pad * 2) / span);
  const offX = (width - (maxX - minX) * scale) / 2;
  const offY = (height - (maxY - minY) * scale) / 2;
  return route
    .map((p, i) => {
      const x = offX + (xs[i] - minX) * scale;
      const y = height - (offY + (p[0] - minY) * scale);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
