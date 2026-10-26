"use client";

import { useState } from "react";
import { BatteryMedium, Droplets, Footprints, Moon } from "lucide-react";
import { Sticky, StickyValue as Value } from "@/components/notebook";
import { ErrorNote } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { CycleTab } from "./cycle-tab";
import { DailyTab } from "./daily-tab";
import { DietTab } from "./diet-tab";
import { MindTab } from "./mind-tab";
import { useWellness } from "./use-wellness";

const TABS = [
  { id: "today", label: "Today" },
  { id: "diet", label: "Diet" },
  { id: "period", label: "Period tracker" },
  { id: "mind", label: "Mental health" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function WellnessScreen({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("today");
  const w = useWellness(today, setError);
  const day = w.query.data;

  if (w.query.isPending) return <p className="text-sm text-muted-foreground">Getting today ready…</p>;
  if (w.query.isError) return <ErrorNote message={w.query.error.message} onRetry={() => w.query.refetch()} />;

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-6 md:grid-cols-4">
        <Sticky label="Sleep" icon={Moon} caption="rest well" tilt="-rotate-1 [--tape-tilt:-4deg]" tone="bg-lilac text-lilac-foreground">
          <Value value={day?.sleep_hours ?? "—"} unit="hours" />
        </Sticky>
        <Sticky label="Water" icon={Droplets} caption="little sips count" tilt="rotate-1 [--tape-tilt:3deg]" tone="bg-sky text-sky-foreground">
          <Value value={day?.water_glasses ?? 0} unit="glasses" />
        </Sticky>
        <Sticky label="Energy" icon={BatteryMedium} caption="out of five" tilt="-rotate-[0.5deg] [--tape-tilt:-2deg]" tone="bg-butter text-butter-foreground">
          <Value value={day?.energy ?? "—"} unit="of 5" />
        </Sticky>
        <Sticky label="Movement" icon={Footprints} caption="any kind counts" tilt="rotate-[1.5deg] [--tape-tilt:4deg]" tone="bg-accent text-accent-foreground">
          <Value value={day?.movement_minutes ?? 0} unit="min" />
        </Sticky>
      </div>

      <div role="tablist" aria-label="Wellness sections" className="mt-10 flex gap-5 overflow-x-auto border-b border-foreground/15 sm:gap-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 pb-2 font-serif text-lg tracking-tight whitespace-nowrap transition-colors sm:text-xl",
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-8">
        {tab === "today" && day && <DailyTab today={today} day={day} w={w} />}
        {tab === "diet" && <DietTab today={today} />}
        {tab === "period" && <CycleTab today={today} />}
        {tab === "mind" && <MindTab today={today} />}
      </div>
    </>
  );
}
