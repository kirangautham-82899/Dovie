"use client";

import { Droplets, Footprints, Repeat, Timer } from "lucide-react";
import { StatTile } from "@/components/stat-tile";
import { useTasks } from "@/features/tasks/use-tasks";
import { useHabits } from "@/features/habits/use-habits";
import { useWellness } from "@/features/wellness/use-wellness";

const noop = () => {};

function Ring({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="size-14 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        stroke="url(#ring)"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        className="transition-[stroke-dashoffset] duration-700"
      />
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--chart-1)" />
          <stop offset="1" stopColor="var(--chart-2)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * A one-glance summary of the day. It reads the same cached queries as the
 * cards below it, so it costs no extra requests.
 */
export function TodayGlance({ today }: { today: string }) {
  const tasks = useTasks(today, noop).query.data ?? [];
  const habits = useHabits(today, noop).query.data ?? [];
  const day = useWellness(today, noop).query.data;

  const done = tasks.filter((t) => t.completed_at !== null).length;
  const ratio = tasks.length ? done / tasks.length : 0;
  const habitsDone = habits.filter((h) => h.done_today).length;

  return (
    <div className="ruled mb-6 grid-cols-2 md:grid-cols-5">
      <div className="relative col-span-2 flex items-center gap-3 p-4 sm:p-5 md:col-span-1">
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
        <div className="relative">
          <Ring value={ratio} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{Math.round(ratio * 100)}%</span>
        </div>
        <div>
          <p className="text-[0.64rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">Plans</p>
          <p className="font-serif text-[1.7rem] leading-none">
            {done}
            <span className="text-base text-muted-foreground"> / {tasks.length}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{ratio === 1 && tasks.length ? "All done. Lovely." : "One at a time"}</p>
        </div>
      </div>
      <StatTile icon={Repeat} label="Habits" value={`${habitsDone}/${habits.length}`} caption="checked off today" tone="lilac" />
      <StatTile icon={Droplets} label="Water" value={day?.water_glasses ?? 0} unit="glasses" caption="little sips count" tone="sky" />
      <StatTile icon={Footprints} label="Movement" value={day?.movement_minutes ?? 0} unit="min" caption="any kind counts" tone="peach" />
      <StatTile icon={Timer} label="Focus" value={day?.focus_minutes ?? 0} unit="min" caption="gentle attention" tone="mint" />
    </div>
  );
}
