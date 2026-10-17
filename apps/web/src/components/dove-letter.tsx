import { DoveMark } from "@/components/logo";
import { cn } from "@/lib/utils";

/**
 * Dovie's signature image: a dove carrying a small letter on two strings.
 * The letter's content goes in `children`. Pass `still` for pages with forms,
 * so the letter stays put while someone types.
 */
export function DoveLetter({
  children,
  still = false,
  className,
}: {
  children: React.ReactNode;
  still?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div aria-hidden className="animate-float relative mx-auto flex w-full flex-col items-center">
        <svg viewBox="6 6 28 27" className="relative z-10 -mb-1 w-20 overflow-visible sm:w-24">
          <path
            className="fill-primary"
            d="M9 23.5c4.2.3 7.4-.6 9.6-2.9l3-3.2c1.4-1.5 3.3-2.2 5.2-1.9l2.7.4-2.2 1.6c-.6.5-.9 1.2-.8 2l.3 2.3c.5 3.6-2.2 6.8-5.8 6.8h-1.8L15 31l1.2-3.4C13 27.2 10.5 25.8 9 23.5Z"
          />
          <path
            className="animate-flap fill-primary/55 [transform-box:fill-box] [transform-origin:0%_100%]"
            d="M18 20.5 21.5 7.5c3.6 1.4 6 4.6 6.3 8.4Z"
          />
          <circle cx="26.4" cy="17.6" r="0.9" className="fill-card" />
        </svg>
        <svg viewBox="0 0 200 26" preserveAspectRatio="none" className="relative z-10 -mb-px h-6 w-[78%]">
          <path
            d="M100 0 28 26M100 0 172 26"
            className="stroke-primary/70"
            strokeWidth="1.2"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div
        className={cn(
          "relative mx-auto w-full origin-top rounded-2xl border border-white/80 bg-card px-5 py-5 shadow-soft sm:px-6",
          !still && "animate-sway",
        )}
      >
        <span
          aria-hidden
          className="absolute top-3 right-3 rotate-6 rounded-md border-2 border-dashed border-primary/70 bg-secondary p-1"
        >
          <DoveMark className="size-6" />
        </span>
        {children}
      </div>
    </div>
  );
}
