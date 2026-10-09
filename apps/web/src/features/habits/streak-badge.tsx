import { Flame } from "lucide-react";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak < 1) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
      <Flame className="size-3" aria-hidden />
      {streak} {streak === 1 ? "day" : "days"}
    </span>
  );
}
