import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** The short "this is not advice" line shown on screens that touch health or money. */
export function AdviceNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="note" className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
