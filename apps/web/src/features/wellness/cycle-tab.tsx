"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slip } from "@/components/notebook";
import { ErrorNote } from "@/components/page-header";
import { addDays, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { FLOWS, SYMPTOMS, mondayOf, summarize, type CycleLog } from "./cycle";
import { Chips, Heading, MultiChips } from "./parts";
import { useCycle } from "./use-body";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKS = 6;

function untilText(days: number) {
  if (days === 0) return "expected today";
  if (days === 1) return "in 1 day";
  if (days > 1) return `in ${days} days`;
  return `${-days} ${days === -1 ? "day" : "days"} past the estimate`;
}

/** A period tracker: log bleeding and symptoms, see where you are in the cycle and when the next one is likely. */
export function CycleTab({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const c = useCycle(today, setError);
  const [selected, setSelected] = useState(today);
  const [shift, setShift] = useState(0);

  const logs = c.query.data ?? [];
  const s = summarize(logs, today);
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const expected = new Set(s.expected);

  const start = addDays(mondayOf(today), -(WEEKS - 2) * 7 + shift * WEEKS * 7);
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i));
  const current = byDate.get(selected);

  function update(patch: Partial<CycleLog>) {
    setError(null);
    c.setDay.mutate({ log_date: selected, flow: current?.flow ?? null, symptoms: current?.symptoms ?? [], ...patch });
  }

  const now = s.periodDay ? `Period day ${s.periodDay}` : s.cycleDay ? `Day ${s.cycleDay}` : "Not started";

  return (
    <Slip className="p-5 sm:p-6">
      <Heading title="Period tracker" aside="private to you" />
      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
      {c.query.isError && (
        <div className="mt-3">
          <ErrorNote message={`Could not load your cycle: ${c.query.error.message}`} onRetry={() => c.query.refetch()} />
        </div>
      )}

      <dl className="mt-5 grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="py-3 sm:pr-4">
          <dt className="eyebrow">Now</dt>
          <dd className="font-serif text-2xl leading-tight">{now}</dd>
          <p className="text-xs text-muted-foreground">{s.cycleDay ? "of your current cycle" : "Log your first day of bleeding"}</p>
        </div>
        <div className="py-3 sm:px-4">
          <dt className="eyebrow">Next period</dt>
          <dd className="font-serif text-2xl leading-tight">
            {s.nextStart ? formatDate(s.nextStart, { day: "numeric", month: "short" }) : "—"}
          </dd>
          <p className="text-xs text-muted-foreground">{s.daysUntil !== null ? untilText(s.daysUntil) : "An estimate appears after your first log"}</p>
        </div>
        <div className="py-3 sm:pl-4">
          <dt className="eyebrow">Typical</dt>
          <dd className="font-serif text-2xl leading-tight">{s.cycleDays} days</dd>
          <p className="text-xs text-muted-foreground">
            {s.cyclesCounted >= 2 ? `from your last ${s.cyclesCounted} cycles` : "a starting guess; log a couple of cycles"} · period ~{s.periodDays}
          </p>
        </div>
      </dl>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {formatDate(days[0], { day: "numeric", month: "short" })} to {formatDate(days[days.length - 1], { day: "numeric", month: "short" })}
            </p>
            <div className="flex items-center gap-0.5">
              <Button size="icon-sm" variant="ghost" aria-label="Earlier weeks" onClick={() => setShift((n) => n - 1)}>
                <ChevronLeft />
              </Button>
              <Button size="xs" variant="secondary" disabled={shift === 0} onClick={() => setShift(0)}>
                Now
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Later weeks" disabled={shift >= 0} onClick={() => setShift((n) => n + 1)}>
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Your cycle days">
            {WEEKDAYS.map((w) => (
              <span key={w} className="pb-0.5 text-[0.6rem] font-bold tracking-wider text-muted-foreground uppercase">
                {w}
              </span>
            ))}
            {days.map((d) => {
              const log = byDate.get(d);
              const flow = log?.flow ?? null;
              const future = d > today;
              return (
                <button
                  key={d}
                  type="button"
                  role="gridcell"
                  disabled={future}
                  aria-selected={d === selected}
                  aria-label={`${formatDate(d, { weekday: "long", day: "numeric", month: "long" })}${flow ? `, ${FLOWS[flow - 1].label.toLowerCase()} flow` : ""}${expected.has(d) ? ", period expected" : ""}`}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "relative flex aspect-[5/4] flex-col items-center justify-center border text-xs tabular-nums transition-colors",
                    flow === 1 && "border-transparent bg-primary/25",
                    flow === 2 && "border-transparent bg-primary/55",
                    flow === 3 && "border-transparent bg-primary text-primary-foreground",
                    !flow && (expected.has(d) ? "border-dashed border-primary" : "border-foreground/10 hover:bg-secondary"),
                    d === today && "font-bold ring-1 ring-foreground/50",
                    d === selected && "outline-2 outline-offset-1 outline-foreground/70",
                    future && !expected.has(d) && "text-muted-foreground/40",
                    future && "cursor-default",
                  )}
                >
                  {Number(d.slice(8))}
                  {log && log.symptoms.length > 0 && <span className="absolute bottom-1 size-1 rounded-full bg-foreground/60" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.65rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2.5 bg-primary/55" /> period
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 border border-dashed border-primary" /> expected
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1 rounded-full bg-foreground/60" /> symptoms
            </span>
          </p>
        </div>

        <div className="space-y-5">
          <p className="font-serif text-lg leading-tight">{formatDate(selected, { weekday: "long", day: "numeric", month: "long" })}</p>
          <div className="space-y-2">
            <p className="font-hand text-xl leading-none text-secondary-foreground">flow</p>
            <Chips label="Flow" options={FLOWS} value={current?.flow ?? null} onChange={(flow) => update({ flow })} />
          </div>
          <div className="space-y-2">
            <p className="font-hand text-xl leading-none text-secondary-foreground">how does your body feel?</p>
            <MultiChips
              label="Symptoms"
              options={SYMPTOMS}
              values={current?.symptoms ?? []}
              onToggle={(sym) => {
                const have = current?.symptoms ?? [];
                update({ symptoms: have.includes(sym) ? have.filter((x) => x !== sym) : [...have, sym] });
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Tap a day to log it. Estimates come only from what you log. Dovie is for tracking and is not medical advice or contraception.</p>
        </div>
      </div>
    </Slip>
  );
}
