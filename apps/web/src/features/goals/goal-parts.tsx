"use client";

import { formatAmount } from "@/features/fitness/format";
import { formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { type Area, type Goal } from "./api";
import { PACE, pace } from "./pace";

export const AREA_TONE: Record<Area, string> = {
  health: "bg-secondary text-secondary-foreground",
  money: "bg-butter text-butter-foreground",
  balance: "bg-sky text-sky-foreground",
  growth: "bg-lilac text-lilac-foreground",
};

export const CHEERS: Record<number, string> = {
  25: "A quarter of the way. The start is the hardest part.",
  50: "Halfway there. Look how far you've come.",
  75: "Three quarters done. The finish is in sight.",
  100: "You did it. Take a moment to enjoy this one.",
};

/** "1 book", "3 books": a unit typed in the plural loses its "s" for exactly one. */
export const amount = (n: number, unit: string | null) => {
  const u = unit && Math.abs(n) === 1 && /[^s]s$/i.test(unit) ? unit.slice(0, -1) : unit;
  return `${formatAmount(n)}${u ? ` ${u}` : ""}`;
};

export const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** A progress ring; the number sits in the middle. */
export function Ring({ value, size = 56, stroke = 6, children }: { value: number | null; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - value)}
            className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-6 items-end gap-px" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn("w-1.5 rounded-sm", v ? "bg-primary/70" : "bg-muted")}
          style={{ height: `${v ? 25 + (v / max) * 75 : 12}%` }}
        />
      ))}
    </div>
  );
}

export function PacePill({ status }: { status: keyof typeof PACE }) {
  const p = PACE[status];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", p.className)}>{p.label}</span>;
}

/** One line on where a goal stands: days left, what a week needs, or when it lands. */
export function paceLine(g: Goal, p: ReturnType<typeof pace>, today: string) {
  if (p.status === "done") return g.completed_at ? `Reached ${relativeDay(g.completed_at.slice(0, 10), today)}` : "Reached";
  if (p.status === "overdue") return `Was due ${formatDate(g.target_date!, { day: "numeric", month: "short" })}, still worth it`;
  if (p.daysLeft !== null && p.perWeekNeeded !== null)
    return `${p.daysLeft} days left · about ${amount(Math.ceil(p.perWeekNeeded * 10) / 10, g.unit)} a week`;
  if (p.eta) return `At this pace, done around ${formatDate(p.eta, { day: "numeric", month: "short", year: "numeric" })}`;
  return g.target_value ? "Log a few steps to see your pace" : "A direction, not a deadline";
}
