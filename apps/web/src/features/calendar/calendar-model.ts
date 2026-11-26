"use client";

import { useState } from "react";
import { billDates, type CalendarBill, type CalendarMove, type CalendarTask, type MonthData, type TimeBlock } from "./api";

export const LAYERS = [
  { id: "plans", label: "Plans", dot: "bg-primary" },
  { id: "time", label: "Time", dot: "bg-lilac-foreground/70" },
  { id: "bills", label: "Bills", dot: "bg-butter-foreground/70" },
  { id: "mood", label: "Mood", dot: "bg-mint-foreground/70" },
  { id: "life", label: "Journal & moves", dot: "bg-sky-foreground/70" },
  { id: "spend", label: "Spend heat", dot: "bg-secondary-foreground/40" },
] as const;

export type Layer = (typeof LAYERS)[number]["id"];

const ALL_LAYERS = LAYERS.map((l) => l.id) as Layer[];

const LAYER_STORE = "dovie.calendar.layers";

/** Mood 1–5, from heavy blue to bright rose. */
export const MOOD_DOT: Record<number, string> = {
  1: "bg-sky-foreground/70",
  2: "bg-lilac-foreground/60",
  3: "bg-butter-foreground/60",
  4: "bg-mint-foreground/70",
  5: "bg-primary",
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

export function minutesOf(b: TimeBlock) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return Math.max(0, toMin(b.ends_at) - toMin(b.starts_at));
}

export const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

export type Day = {
  tasks: CalendarTask[];
  blocks: TimeBlock[];
  bills: CalendarBill[];
  mood?: number;
  words?: number;
  spend?: number;
  moves: CalendarMove[];
  focus?: number;
};

/** Files every dated thing under its day, with recurring bills spread across the grid. */
export function byDay(data: MonthData, from: string, to: string) {
  const days = new Map<string, Day>();
  const get = (d: string) => {
    let v = days.get(d);
    if (!v) days.set(d, (v = { tasks: [], blocks: [], bills: [], moves: [] }));
    return v;
  };
  for (const t of data.tasks) get(t.due_date).tasks.push(t);
  for (const b of data.blocks) get(b.block_date).blocks.push(b);
  for (const b of data.bills) for (const d of billDates(b, from, to)) get(d).bills.push(b);
  for (const m of data.moods) get(m.date).mood = m.mood;
  for (const j of data.journal) get(j.date).words = j.words;
  for (const s of data.spend) get(s.date).spend = s.paise;
  for (const m of data.moves) get(m.session_date).moves.push(m);
  for (const f of data.focus) get(f.date).focus = f.minutes;
  return days;
}

export const EMPTY: Day = { tasks: [], blocks: [], bills: [], moves: [] };

export function useLayers() {
  // TodayGate renders this only after hydration, so reading storage up front can't mismatch the server.
  const [layers, setLayers] = useState<Layer[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAYER_STORE) ?? "null");
      if (Array.isArray(saved)) return saved.filter((l) => ALL_LAYERS.includes(l));
    } catch {}
    return ALL_LAYERS;
  });
  const toggle = (id: Layer) =>
    setLayers((cur) => {
      const next = cur.includes(id) ? cur.filter((l) => l !== id) : [...cur, id];
      try {
        localStorage.setItem(LAYER_STORE, JSON.stringify(next));
      } catch {}
      return next;
    });
  return { on: (id: Layer) => layers.includes(id), toggle };
}
