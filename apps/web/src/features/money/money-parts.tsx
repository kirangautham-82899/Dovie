"use client";

import { CalendarClock, PiggyBank, Target, Trash2 } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Recurrence } from "./api";
import { FORECAST_STATUS } from "./money-forecast";

export type Dialog = null | "income" | "expense" | "bill" | "budget" | "goal" | { savingsFor: string; title: string };

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  yearly: "Yearly",
  once: "Just once",
};

export function Progress({ value, over = false, muted = false }: { value: number; over?: boolean; muted?: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div
        className={cn("h-full rounded-full transition-all", over ? "bg-destructive/70" : muted ? "bg-primary/40" : "bg-primary")}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

/** Cards on the money page are a little tighter than the default. */
export const dense = "p-4 sm:p-5";

/** Sticky notes show whole rupees; the lists below keep the paise. */
export const whole = (paise: number) => formatPaise(Math.round(paise / 100) * 100);

export const LEDGER_FILTERS = [
  { value: "all", label: "All" },
  { value: "in", label: "In" },
  { value: "out", label: "Out" },
] as const;

export type LedgerFilter = (typeof LEDGER_FILTERS)[number]["value"];

export type LedgerRow = { id: string; kind: "in" | "out"; title: string; tag: string; date: string; amount: number };

export function StatusPill({ status }: { status: keyof typeof FORECAST_STATUS }) {
  const s = FORECAST_STATUS[status];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", s.className)}>{s.label}</span>;
}

/** Planning actions, grouped apart from the everyday in/out buttons. */
export const PLAN_ACTIONS = [
  { dialog: "bill", label: "Bill", icon: CalendarClock },
  { dialog: "budget", label: "Budget", icon: Target },
  { dialog: "goal", label: "Goal", icon: PiggyBank },
] as const;

/** Quiet until the row is hovered or focused; always shown on touch screens, which can't hover. */
export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition outline-none group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-destructive/25 [@media(hover:hover)]:opacity-0"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
