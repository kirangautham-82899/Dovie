"use client";

import { Droplets, Footprints, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTasks } from "@/features/tasks/use-tasks";
import { useWellness } from "@/features/wellness/use-wellness";

const noop = () => {};

function Ring({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="size-14 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-foreground/10" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        stroke="var(--primary)"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
}

/** One pinned note: a tinted square with a strip of tape and a slight tilt. */
function Sticky({
  label,
  icon: Icon,
  caption,
  tilt,
  tone,
  className,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  caption: string;
  tilt: string;
  tone: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("sticky-note tape p-4 pt-5 hover:rotate-0 sm:p-5 sm:pt-6", tone, tilt, className)}>
      <p className="flex items-center gap-1.5 font-hand text-xl leading-none">
        {Icon && <Icon className="size-4 opacity-80" />}
        {label}
      </p>
      {children}
      <p className="mt-1.5 truncate font-hand text-lg leading-none opacity-75">{caption}</p>
    </div>
  );
}

function Value({ value, unit }: { value: React.ReactNode; unit?: string }) {
  return (
    <p className="mt-2 font-serif text-4xl leading-none tracking-tight text-foreground">
      {value}
      {unit && <span className="ml-1 font-sans text-xs text-muted-foreground">{unit}</span>}
    </p>
  );
}

/**
 * A one-glance summary of the day as four sticky notes. It reads the same
 * cached queries as the lists below it, so it costs no extra requests.
 */
export function TodayGlance({ today }: { today: string }) {
  const tasks = useTasks(today, noop).query.data ?? [];
  const day = useWellness(today, noop).query.data;

  const done = tasks.filter((t) => t.completed_at !== null).length;
  const ratio = tasks.length ? done / tasks.length : 0;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-6 md:grid-cols-4">
      <Sticky
        label="Plans"
        caption={ratio === 1 && tasks.length ? "All done. Lovely." : "one at a time"}
        tilt="-rotate-1 [--tape-tilt:-4deg]"
        tone="bg-secondary text-secondary-foreground"
      >
        <div className="mt-2 flex items-center gap-3">
          <div className="relative shrink-0">
            <Ring value={ratio} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
              {Math.round(ratio * 100)}%
            </span>
          </div>
          <p className="font-serif text-4xl leading-none text-foreground">
            {done}
            <span className="text-base text-muted-foreground"> / {tasks.length}</span>
          </p>
        </div>
      </Sticky>
      <Sticky
        label="Water"
        icon={Droplets}
        caption="little sips count"
        tilt="rotate-1 [--tape-tilt:3deg]"
        tone="bg-sky text-sky-foreground"
      >
        <Value value={day?.water_glasses ?? 0} unit="glasses" />
      </Sticky>
      <Sticky
        label="Movement"
        icon={Footprints}
        caption="any kind counts"
        tilt="-rotate-[0.5deg] [--tape-tilt:-2deg]"
        tone="bg-accent text-accent-foreground"
      >
        <Value value={day?.movement_minutes ?? 0} unit="min" />
      </Sticky>
      <Sticky
        label="Focus"
        icon={Timer}
        caption="gentle attention"
        tilt="rotate-[1.5deg] [--tape-tilt:4deg]"
        tone="bg-mint text-mint-foreground"
      >
        <Value value={day?.focus_minutes ?? 0} unit="min" />
      </Sticky>
    </div>
  );
}
