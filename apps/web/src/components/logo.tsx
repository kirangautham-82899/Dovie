import { cn } from "@/lib/utils";

/** The Dovie mark: a small dove in a sage circle. */
export function DoveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-9", className)}>
      <circle cx="20" cy="20" r="20" className="fill-secondary" />
      <path
        className="fill-primary"
        d="M9 23.5c4.2.3 7.4-.6 9.6-2.9l3-3.2c1.4-1.5 3.3-2.2 5.2-1.9l2.7.4-2.2 1.6c-.6.5-.9 1.2-.8 2l.3 2.3c.5 3.6-2.2 6.8-5.8 6.8h-1.8L15 31l1.2-3.4C13 27.2 10.5 25.8 9 23.5Z"
      />
      <path className="fill-primary/60" d="M17.5 21.2 13 13.5c3.4.4 6.3 2 8.4 4.6l-3.9 3.1Z" />
      <circle cx="26.4" cy="17.6" r="0.9" className="fill-card" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DoveMark />
      <span className="font-serif text-2xl leading-none tracking-tight">dovie.</span>
    </span>
  );
}
