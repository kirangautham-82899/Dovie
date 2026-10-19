import { cn } from "@/lib/utils";

/** A dot-grid notebook page, the backdrop for Today and Money. */
export function Paper({ children }: { children: React.ReactNode }) {
  return <div className="dot-paper p-4 sm:p-6 lg:p-8">{children}</div>;
}

/** A loose slip of paper for the smaller cards that sit on the page. */
export function Slip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("border bg-card/95 shadow-sm", className)}>{children}</div>;
}

/** One pinned note: a tinted square with a strip of tape and a slight tilt. */
export function Sticky({
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

/** The big number on a sticky note. */
export function StickyValue({ value, unit, className }: { value: React.ReactNode; unit?: string; className?: string }) {
  return (
    <p className={cn("mt-2 font-serif text-4xl leading-none tracking-tight text-foreground", className)}>
      {value}
      {unit && <span className="ml-1 font-sans text-xs text-muted-foreground">{unit}</span>}
    </p>
  );
}
