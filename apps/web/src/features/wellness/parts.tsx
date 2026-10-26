import { cn } from "@/lib/utils";

/** A section heading with a highlighter swipe, like the notebook pages. */
export function Heading({ title, aside, className }: { title: string; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h3 className="font-serif text-xl leading-tight tracking-tight">
        <span className="highlighter -mx-1 px-1">{title}</span>
      </h3>
      {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
    </div>
  );
}

const chip = "h-7 border px-2.5 text-xs font-medium transition-colors";
const chipOn = "border-primary bg-primary text-primary-foreground";
const chipOff = "border-foreground/20 bg-card/70 text-muted-foreground hover:border-primary hover:bg-secondary";

/** Square chips acting as a single-choice radio group. Choosing the chosen one again clears it. */
export function Chips<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(value === o.value ? null : o.value)}
          className={cn(chip, value === o.value ? chipOn : chipOff)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Square chips where any number can be on. */
export function MultiChips({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={values.includes(o)} onClick={() => onToggle(o)} className={cn(chip, values.includes(o) ? chipOn : chipOff)}>
          {o}
        </button>
      ))}
    </div>
  );
}

/** The underlined, borderless input used on notebook slips. */
export const lineInput =
  "h-9 min-w-0 border-0 border-b border-foreground/25 bg-transparent px-0 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary";
