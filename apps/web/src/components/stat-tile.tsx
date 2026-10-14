import { cn } from "@/lib/utils";

export type Tone = "rose" | "peach" | "lilac" | "sky" | "mint" | "butter";

// Each tone is a coloured top line plus a matching icon. Put tiles in a .ruled grid.
const TONES: Record<Tone, { bar: string; icon: string }> = {
  rose: { bar: "bg-chart-1", icon: "text-chart-1" },
  peach: { bar: "bg-chart-2", icon: "text-chart-2" },
  lilac: { bar: "bg-chart-3", icon: "text-chart-3" },
  sky: { bar: "bg-chart-4", icon: "text-chart-4" },
  mint: { bar: "bg-chart-5", icon: "text-chart-5" },
  butter: { bar: "bg-[hsl(40_85%_62%)]", icon: "text-[hsl(40_85%_50%)]" },
};

/** A compact number with a coloured top line, used across Today, Money, Wellness and the weekly review. */
export function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  caption,
  tone,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  unit?: string;
  caption?: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <div className={cn("relative p-4 sm:p-5", className)}>
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-0.5", TONES[tone].bar)} />
      <p className="flex items-center gap-1.5 text-[0.64rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
        {Icon && <Icon className={cn("size-3.5", TONES[tone].icon)} />}
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl leading-none tracking-tight">
        {value}
        {unit && <span className="ml-1 font-sans text-xs text-muted-foreground">{unit}</span>}
      </p>
      {caption && <p className="mt-1 truncate text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}
