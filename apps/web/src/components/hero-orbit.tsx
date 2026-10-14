"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BookHeart, Check, Droplets, Flame, LineChart, Lock, Sparkles, Sun, Timer, Wallet } from "lucide-react";
import { DoveMark } from "@/components/logo";
import { cn } from "@/lib/utils";

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

const INSIGHTS = [
  "You finish more of your plans after 7+ hours of sleep.",
  "Food budget is getting close. Maybe a cosy home dinner tonight?",
  "Tuesdays are your strongest day. Save the big things for then.",
  "On pace to spend ₹11,500 this month, a little under last month.",
  "Focus time is trending up for next week. Lovely.",
];

const STEPS = 8;

/** One floating chip. Content changes with `step` so each one feels alive. */
function Chip({ kind, step, seconds }: { kind: number; step: number; seconds: number }) {
  const base = "flex items-center gap-1.5 rounded-2xl border border-white/70 bg-card/90 px-2.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2 text-[0.68rem] shadow-soft backdrop-blur-md sm:text-xs dark:border-white/10";
  switch (kind) {
    case 0: {
      const done = Math.min(3, step % 5);
      return (
        <div className={base}>
          <Sun className="size-4 text-primary" />
          <div>
            <p className="font-semibold">Plans {done}/3</p>
            <p className="mt-0.5 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "flex size-3 items-center justify-center rounded-full border transition-colors duration-500",
                    i < done ? "border-primary bg-primary text-primary-foreground" : "border-primary/40",
                  )}
                >
                  {i < done && <Check className="size-2" />}
                </span>
              ))}
            </p>
          </div>
        </div>
      );
    }
    case 1: {
      const amount = 980 + (step % STEPS) * 37;
      return (
        <div className={base}>
          <Wallet className="size-4 text-chart-2" />
          <div>
            <p className="hidden text-[0.6rem] text-muted-foreground sm:block">Spent this week</p>
            <p className="font-serif text-base leading-none tabular-nums">₹{amount.toLocaleString("en-IN")}</p>
          </div>
        </div>
      );
    }
    case 2: {
      const glasses = (step % STEPS) + 1;
      return (
        <div className={base}>
          <div>
            <p className="font-semibold">Water</p>
            <p className="mt-0.5 flex gap-px text-chart-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Droplets key={i} className={cn("size-3 transition-opacity duration-500", i < glasses ? "opacity-100" : "opacity-20")} />
              ))}
            </p>
          </div>
        </div>
      );
    }
    case 3: {
      const streak = 9 + (step % 4);
      return (
        <div className={base}>
          <Flame className="size-4 text-chart-2" />
          <div>
            <p className="font-semibold tabular-nums">{streak}-day streak</p>
            <p className="hidden text-[0.6rem] text-muted-foreground sm:block">Morning stretch</p>
          </div>
        </div>
      );
    }
    case 4: {
      const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
      const ss = String(seconds % 60).padStart(2, "0");
      return (
        <div className={base}>
          <Timer className="size-4 text-chart-3" />
          <div>
            <p className="hidden text-[0.6rem] text-muted-foreground sm:block">Focus</p>
            <p className="font-serif text-base leading-none tabular-nums">
              {mm}:{ss}
            </p>
          </div>
        </div>
      );
    }
    case 5:
      return (
        <div className={base}>
          <span className="flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Lock className="size-3" />
          </span>
          <div>
            <p className="font-semibold">Journal<span className="hidden sm:inline"> saved</span></p>
            <p className="hidden items-center gap-1 text-[0.6rem] text-muted-foreground sm:flex">
              <BookHeart className="size-3" /> only you can read it
            </p>
          </div>
        </div>
      );
    default: {
      const heights = [40, 65, 50, 90, 70, 35, 55].map((h, i) => ((h + step * 13 * (i + 1)) % 70) + 25);
      return (
        <div className={base}>
          <LineChart className="size-4 text-chart-5" />
          <div>
            <p className="hidden text-[0.6rem] text-muted-foreground sm:block">Your week</p>
            <p className="flex h-4 items-end gap-0.5">
              {heights.map((h, i) => (
                <span key={i} className="w-1.5 rounded-t-sm bg-primary/70 transition-all duration-700" style={{ height: `${h}%` }} />
              ))}
            </p>
          </div>
        </div>
      );
    }
  }
}

/**
 * The landing hero: a dove at the centre of an orbit of small, live moments
 * from each part of Dovie. Rings drift, chips orbit while staying upright,
 * an insight line cycles underneath, and the scene tilts with the pointer.
 */
export function HeroOrbit() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(25 * 60);
  const tilt = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const a = window.setInterval(() => setStep((s) => s + 1), 1800);
    const b = window.setInterval(() => setSeconds((s) => (s <= 24 * 60 ? 25 * 60 : s - 1)), 1000);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, [reduced]);

  // Tilt toward the pointer; written straight to the DOM to avoid re-renders.
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (tilt.current) tilt.current.style.transform = `rotateX(${-y * 12}deg) rotateY(${x * 12}deg)`;
    });
  }
  function onPointerLeave() {
    cancelAnimationFrame(frame.current);
    if (tilt.current) tilt.current.style.transform = "rotateX(0deg) rotateY(0deg)";
  }

  const chips = 7;
  const insight = INSIGHTS[Math.floor(step / 2) % INSIGHTS.length];

  return (
    <div className="w-full">
      <div
        aria-hidden
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="@container relative mx-auto aspect-square w-full max-w-[21rem] [--r:33cqw] [perspective:1200px] sm:max-w-[32rem] sm:[--r:38cqw]"
      >
        <div ref={tilt} className="relative size-full transition-transform duration-500 ease-out [transform-style:preserve-3d]">
          {/* soft glow */}
          <div className="absolute inset-[22%] rounded-full bg-[radial-gradient(circle,hsl(343_85%_80%/0.75),hsl(266_80%_88%/0.45)_55%,transparent_72%)] blur-2xl dark:opacity-40" />

          {/* outer ring with sparkles */}
          <svg viewBox="0 0 100 100" className="animate-orbit absolute inset-[4%] size-[92%] overflow-visible">
            <circle cx="50" cy="50" r="48" fill="none" stroke="var(--primary)" strokeOpacity="0.22" strokeWidth="0.35" strokeDasharray="0.8 2.2" />
            {[20, 140, 255].map((deg) => (
              <circle
                key={deg}
                cx={50 + 48 * Math.cos((deg * Math.PI) / 180)}
                cy={50 + 48 * Math.sin((deg * Math.PI) / 180)}
                r="1.1"
                fill="var(--chart-2)"
              />
            ))}
          </svg>
          {/* inner ring turning the other way */}
          <svg viewBox="0 0 100 100" className="animate-orbit-fast absolute inset-[24%] size-[52%] overflow-visible">
            <circle cx="50" cy="50" r="48" fill="none" stroke="var(--chart-3)" strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="5 4" />
            {[60, 200, 320].map((deg) => (
              <circle
                key={deg}
                cx={50 + 48 * Math.cos((deg * Math.PI) / 180)}
                cy={50 + 48 * Math.sin((deg * Math.PI) / 180)}
                r="1.8"
                fill="var(--primary)"
                opacity="0.7"
              />
            ))}
          </svg>

          {/* centre */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="animate-halo absolute inset-0 rounded-full bg-primary/25" />
            <span className="animate-halo absolute inset-0 rounded-full bg-chart-3/25 [animation-delay:1.8s]" />
            <div className="relative flex size-20 flex-col items-center justify-center rounded-full border border-white/80 bg-card/95 shadow-soft sm:size-36 dark:border-white/10">
              <DoveMark className="size-10 sm:size-16" />
              <p className="mt-1 hidden font-serif text-base italic sm:block">your day</p>
            </div>
          </div>

          {/* orbiting chips: each sits on a 0x0 anchor so counter-rotation keeps it upright and centred */}
          <div className="animate-orbit absolute inset-0">
            {Array.from({ length: chips }, (_, i) => {
              const angle = (i * 360) / chips - 90;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 size-0"
                  style={{ transform: `rotate(${angle}deg) translateX(var(--r)) rotate(${-angle}deg)` }}
                >
                  <div className="animate-orbit-reverse size-0">
                    <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                      <Chip kind={i} step={step} seconds={seconds} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* insight ticker */}
      <p className="mx-auto mt-2 flex max-w-md items-start justify-center gap-2 px-4 text-center text-sm">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <span key={insight} className="animate-fade-swap">
          <span className="font-semibold text-primary">Dovie noticed: </span>
          <span className="text-muted-foreground">{insight}</span>
        </span>
      </p>
    </div>
  );
}
