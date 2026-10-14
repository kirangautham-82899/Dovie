"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BatteryFull,
  BookHeart,
  Check,
  CheckCircle2,
  Droplets,
  Flame,
  Lock,
  Signal,
  Star,
  Wallet,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  { title: "Brew a slow morning tea", meta: "7:30 · 10 min", priority: true },
  { title: "Water the balcony plants", meta: "8:00 · 5 min", priority: false },
  { title: "Read a chapter before bed", meta: "21:30 · 20 min", priority: true },
];
const HABITS = ["M", "T", "W", "T", "F", "S", "S"];
const STEP_MS = 1500;
// Steps 0-3 tick plans off one by one; 4-6 linger on the finished day; then it loops.
const STEPS = 7;

const REDUCED = "(prefers-reduced-motion: reduce)";

function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/**
 * An animated preview of the Today screen. Plans tick themselves off, the
 * ring fills, a small toast confirms each one, water and the habit streak fill
 * in, and the focus timer runs.
 */
export function HeroPhone({ cta = true }: { cta?: boolean }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(25 * 60);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % STEPS), STEP_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setSeconds((s) => (s <= 24 * 60 ? 25 * 60 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [reduced]);

  const done = reduced ? 2 : Math.min(step, PLANS.length);
  const ratio = done / PLANS.length;
  const allDone = done === PLANS.length;
  const water = reduced ? 5 : Math.min(2 + step, 6);
  const streak = reduced ? 5 : allDone ? 5 : 4;
  const toast = !reduced && step >= 1 && step <= PLANS.length ? PLANS[step - 1].title : null;
  const r = 17;
  const c = 2 * Math.PI * r;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="relative mx-auto w-full max-w-[20rem]">
      {/* Soft halo so the device lifts off the page. */}
      <div aria-hidden className="absolute inset-x-6 top-10 -z-10 h-72 rounded-full bg-primary/25 blur-3xl" />

      <div aria-hidden>
        <div className="animate-float-slow mx-auto w-[17.5rem] rounded-[2.6rem] bg-foreground/90 p-[6px] shadow-2xl ring-1 ring-black/5 [--tilt:-2deg] dark:bg-white/15">
          <div className="relative overflow-hidden rounded-[2.2rem] bg-background px-4 pt-2.5 pb-3">
            {/* status bar */}
            <div className="flex items-center justify-between px-1 text-[0.6rem] font-semibold">
              <span className="tabular-nums">9:41</span>
              <span className="h-[1.1rem] w-[4.6rem] rounded-full bg-foreground/90 dark:bg-white/15" />
              <span className="flex items-center gap-1">
                <Signal className="size-2.5" />
                <Wifi className="size-2.5" />
                <BatteryFull className="size-3" />
              </span>
            </div>

            {/* toast */}
            <div
              className={cn(
                "absolute inset-x-4 top-9 z-10 flex items-center gap-2 rounded-xl border bg-card/95 px-3 py-2 text-[0.65rem] shadow-lg backdrop-blur transition-all duration-500",
                toast ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
              )}
            >
              <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">
                <span className="font-semibold">Done:</span> {toast ?? PLANS[0].title}
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between border-b pb-3">
              <div>
                <p className="text-[0.55rem] font-bold tracking-[0.15em] text-primary uppercase">Tuesday, 14 October</p>
                <p className="mt-0.5 font-serif text-xl leading-tight">Good morning, Alex.</p>
              </div>
              <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-[0.6rem] font-bold text-primary">
                AK
              </span>
            </div>

            <div className="flex items-center gap-3 border-b py-3">
              <div className="relative size-12">
                <svg viewBox="0 0 44 44" className="size-12 -rotate-90">
                  <defs>
                    <linearGradient id="hero-ring" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="var(--chart-1)" />
                      <stop offset="1" stopColor="var(--chart-2)" />
                    </linearGradient>
                  </defs>
                  <circle cx="22" cy="22" r={r} fill="none" className="stroke-muted" strokeWidth="4.5" />
                  <circle
                    cx="22"
                    cy="22"
                    r={r}
                    fill="none"
                    stroke="url(#hero-ring)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - ratio)}
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[0.62rem] font-bold tabular-nums">
                  {Math.round(ratio * 100)}%
                </span>
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold">
                  {done} of {PLANS.length} plans done
                </p>
                <p className={cn("transition-colors", allDone ? "text-primary" : "text-muted-foreground")}>
                  {allDone ? "A cozy day, well kept." : done === 0 ? "Start with something small." : "Lovely. One gentle step at a time."}
                </p>
              </div>
            </div>

            <div className="border-b py-3">
              <div className="mb-1.5 flex items-baseline justify-between">
                <p className="font-serif text-sm">Your top three</p>
                <p className="text-[0.55rem] text-muted-foreground">Today</p>
              </div>
              {PLANS.map((p, i) => {
                const checked = i < done;
                return (
                  <div key={p.title} className="flex items-center gap-2 py-1">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-primary/40",
                        i === done - 1 && !reduced && "animate-[pop_0.4s_ease-out]",
                      )}
                    >
                      {checked && <Check className="size-2.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left bg-no-repeat text-[0.7rem] font-medium transition-[background-size,color] duration-500",
                          checked && "bg-[length:100%_1px] text-muted-foreground",
                        )}
                        style={{ backgroundPositionY: "55%" }}
                      >
                        {p.title}
                      </p>
                      <p className="text-[0.55rem] text-muted-foreground">{p.meta}</p>
                    </div>
                    {p.priority && <Star className="size-3 shrink-0 fill-primary text-primary" />}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 divide-x border-b py-3">
              <div className="pr-2">
                <p className="text-[0.5rem] font-bold tracking-wider text-muted-foreground uppercase">Water</p>
                <p className="mt-1 flex gap-px text-chart-4">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Droplets
                      key={i}
                      className={cn("size-2.5 transition-opacity duration-500", i < water ? "opacity-100" : "opacity-20")}
                    />
                  ))}
                </p>
              </div>
              <div className="px-2">
                <p className="text-[0.5rem] font-bold tracking-wider text-muted-foreground uppercase">Focus</p>
                <p className="font-serif text-base leading-tight tabular-nums">
                  {mm}:{ss}
                </p>
              </div>
              <div className="pl-2">
                <p className="text-[0.5rem] font-bold tracking-wider text-muted-foreground uppercase">Streak</p>
                <p className="flex items-center gap-0.5 font-serif text-base leading-tight">
                  <Flame className="size-3 text-chart-2" />
                  {streak + 7}d
                </p>
              </div>
            </div>

            <div className="border-b py-3">
              <p className="mb-1.5 text-[0.6rem] font-semibold">Morning stretch</p>
              <div className="flex gap-1">
                {HABITS.map((d, i) => (
                  <span
                    key={i}
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[0.5rem] font-bold transition-colors duration-500",
                      i < streak ? "bg-primary text-primary-foreground" : "border text-muted-foreground",
                    )}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-3">
              <p className="flex items-center gap-2 border-l-2 border-chart-2 pl-2 text-[0.66rem]">
                <Wallet className="size-3.5 text-chart-2" /> Internet bill due Friday
              </p>
              <p className="flex items-center gap-2 border-l-2 border-chart-3 pl-2 text-[0.66rem]">
                <BookHeart className="size-3.5 text-chart-3" /> What made today feel warm?
              </p>
              <p className="flex items-center gap-2 border-l-2 border-primary pl-2 text-[0.66rem]">
                <Lock className="size-3.5 text-primary" /> Journal locked · only you can read it
              </p>
            </div>

            <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-foreground/80 dark:bg-white/30" />
          </div>
        </div>
      </div>

      {cta && (
      <Link
        href="/signup"
        className="group mx-auto mt-6 flex w-fit items-center gap-1.5 rounded-full border bg-background/90 px-4 py-2 text-sm font-semibold whitespace-nowrap text-primary shadow-sm backdrop-blur transition-colors hover:border-primary"
      >
        See your own day
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      )}
    </div>
  );
}
