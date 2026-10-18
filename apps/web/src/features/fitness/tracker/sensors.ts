"use client";

// Browser sensor plumbing for the tracker: motion permission, a heart-rate
// strap over Web Bluetooth, the screen wake lock and a status store the live
// screen reads to show what is working.

import { useSyncExternalStore } from "react";
import { liveStore } from "./live-store";

export type SensorStatus = {
  gps: "off" | "searching" | "ok" | "weak" | "denied" | "unavailable";
  motion: "off" | "waiting" | "ok" | "denied" | "unavailable";
  wake: boolean;
  hr: "off" | "connecting" | "on" | "unsupported";
  hrDevice: string | null;
};

let status: SensorStatus = { gps: "off", motion: "off", wake: false, hr: "off", hrDevice: null };
const listeners = new Set<() => void>();

export const sensorStore = {
  get: () => status,
  set(patch: Partial<SensorStatus>) {
    const next = { ...status, ...patch };
    if ((Object.keys(patch) as (keyof SensorStatus)[]).every((k) => next[k] === status[k])) return;
    status = next;
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

const SERVER_STATUS = status;
export function useSensors(): SensorStatus {
  return useSyncExternalStore(sensorStore.subscribe, sensorStore.get, () => SERVER_STATUS);
}

// ---------- motion ----------

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

/** iOS asks for motion access, and only from a tap. Call this inside a click handler. */
export async function requestMotionPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
    sensorStore.set({ motion: "unavailable" });
    return false;
  }
  const request = (window.DeviceMotionEvent as unknown as MotionPermission).requestPermission;
  if (typeof request !== "function") return true;
  try {
    const result = await request();
    if (result !== "granted") sensorStore.set({ motion: "denied" });
    return result === "granted";
  } catch {
    sensorStore.set({ motion: "denied" });
    return false;
  }
}

// ---------- wake lock ----------

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (t: "release", f: () => void) => void };
type WakeLockNav = { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

let wakeLock: WakeLockSentinelLike | null = null;

/** Keeps the screen on so the browser doesn't suspend GPS and the step counter. */
export async function holdWakeLock() {
  const nav = navigator as unknown as WakeLockNav;
  if (!nav.wakeLock || wakeLock || document.visibilityState !== "visible") return;
  try {
    wakeLock = await nav.wakeLock.request("screen");
    sensorStore.set({ wake: true });
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
      sensorStore.set({ wake: false });
    });
  } catch {
    sensorStore.set({ wake: false });
  }
}

export async function releaseWakeLock() {
  const lock = wakeLock;
  wakeLock = null;
  sensorStore.set({ wake: false });
  await lock?.release().catch(() => {});
}

// ---------- heart rate (Bluetooth LE Heart Rate profile) ----------

type HrCharacteristic = EventTarget & {
  value: DataView | null;
  startNotifications: () => Promise<unknown>;
};
type HrDevice = EventTarget & {
  name?: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<{
      getPrimaryService: (s: string) => Promise<{ getCharacteristic: (c: string) => Promise<HrCharacteristic> }>;
    }>;
    disconnect: () => void;
  };
};
type BluetoothNav = {
  bluetooth?: { requestDevice: (o: { filters: { services: string[] }[] }) => Promise<HrDevice> };
};

let hrDevice: HrDevice | null = null;

export function heartRateSupported() {
  return typeof navigator !== "undefined" && !!(navigator as unknown as BluetoothNav).bluetooth;
}

/** Parses a Heart Rate Measurement value: flag bit 0 picks 8- or 16-bit bpm. */
export function parseHeartRate(v: DataView): number {
  const flags = v.getUint8(0);
  return flags & 1 ? v.getUint16(1, true) : v.getUint8(1);
}

/** Pairs a chest strap or watch that broadcasts heart rate. Must run from a tap. */
export async function connectHeartRate() {
  const bt = (navigator as unknown as BluetoothNav).bluetooth;
  if (!bt) {
    sensorStore.set({ hr: "unsupported" });
    return;
  }
  sensorStore.set({ hr: "connecting" });
  try {
    const device = await bt.requestDevice({ filters: [{ services: ["heart_rate"] }] });
    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService("heart_rate");
    const ch = await service.getCharacteristic("heart_rate_measurement");
    await ch.startNotifications();
    ch.addEventListener("characteristicvaluechanged", () => {
      if (!ch.value) return;
      const bpm = parseHeartRate(ch.value);
      if (bpm < 30 || bpm > 240) return;
      liveStore.update((w) =>
        w.status === "running"
          ? { ...w, hrNow: bpm, hrSum: w.hrSum + bpm, hrCount: w.hrCount + 1, hrMax: Math.max(w.hrMax, bpm) }
          : { ...w, hrNow: bpm },
      );
    });
    device.addEventListener("gattserverdisconnected", () => {
      hrDevice = null;
      sensorStore.set({ hr: "off", hrDevice: null });
      liveStore.update((w) => ({ ...w, hrNow: null }));
    });
    hrDevice = device;
    sensorStore.set({ hr: "on", hrDevice: device.name ?? "Heart-rate sensor" });
  } catch {
    // Cancelled the picker or the device dropped.
    sensorStore.set({ hr: "off" });
  }
}

export function disconnectHeartRate() {
  hrDevice?.gatt?.disconnect();
  hrDevice = null;
  sensorStore.set({ hr: "off", hrDevice: null });
}

// ---------- notification ----------

/** A "workout in progress" notification that brings Dovie back when tapped. */
export async function showWorkoutNotification(label: string) {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
  try {
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    await reg.showNotification(`${label} in progress`, {
      body: "Dovie is keeping time. Tap to return to your workout.",
      tag: "dovie-workout",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      requireInteraction: true,
      silent: true,
      data: { url: "/fitness" },
    });
  } catch {
    // Notifications are a nicety; the workout runs without them.
  }
}

export async function clearWorkoutNotification() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const open = await reg?.getNotifications({ tag: "dovie-workout" });
    open?.forEach((n) => n.close());
  } catch {
    // Nothing to clear.
  }
}

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not all browsers vibrate.
  }
}
