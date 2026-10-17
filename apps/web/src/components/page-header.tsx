import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Words shown after the title in italic rose, like the landing headline. */
  accent?: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("animate-rise mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow && (
          <p className="border-l-2 border-primary pl-2.5 text-[0.7rem] font-semibold tracking-[0.14em] text-secondary-foreground uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-[2.2rem] leading-[1.02] tracking-tight sm:text-5xl">
          {title}
          {accent && (
            <>
              {" "}
              <em className="text-rose pr-1">{accent}</em>
            </>
          )}
        </h1>
        {subtitle && <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </header>
  );
}

/** The content column used by every signed-in page. */
export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 lg:px-6 lg:py-6", className)}>{children}</main>;
}

/** A small icon + title row used at the top of a card. */
export function SectionTitle({
  icon: Icon,
  title,
  aside,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-serif text-xl tracking-tight">
        {Icon && <Icon className="size-[1.1rem] text-primary" />}
        {title}
      </h2>
      {aside}
    </div>
  );
}

export function EmptyState({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return (
    <div className="border-l-2 border-primary/30 py-1 pl-3">
      <p className="font-serif text-base">{title}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="border-l-2 border-destructive py-1 pl-3 text-sm text-destructive">
      {message}
      {onRetry && (
        <button type="button" onClick={onRetry} className="ml-2 font-semibold underline">
          Try again
        </button>
      )}
    </div>
  );
}
