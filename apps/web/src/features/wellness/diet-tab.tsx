"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slip } from "@/components/notebook";
import { ErrorNote } from "@/components/page-header";
import { addDays, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MEALS, type Meal } from "./diet-api";
import { Heading, lineInput } from "./parts";
import { useDiet } from "./use-body";

/** A diet diary: what was eaten at each meal, with calories if you like. */
export function DietTab({ today }: { today: string }) {
  const [day, setDay] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const d = useDiet(day, setError);
  const meals = d.query.data ?? [];
  const total = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const rel = relativeDay(day, today);

  return (
    <Slip className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading title="Diet" />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {meals.length === 0 ? "Nothing logged yet." : `${meals.length} ${meals.length === 1 ? "item" : "items"}${total ? ` · about ${total} kcal` : ""}`}
          </p>
        </div>
        <nav aria-label="Choose a day" className="flex items-center gap-0.5">
          <Button size="icon-sm" variant="ghost" aria-label="Previous day" onClick={() => setDay(addDays(day, -1))}>
            <ChevronLeft />
          </Button>
          <span className="min-w-24 text-center text-sm font-medium">
            {rel === "today" || rel === "yesterday" ? `${rel[0].toUpperCase()}${rel.slice(1)}` : formatDate(day, { weekday: "short", day: "numeric", month: "short" })}
          </span>
          <Button size="icon-sm" variant="ghost" aria-label="Next day" disabled={day >= today} onClick={() => setDay(addDays(day, 1))}>
            <ChevronRight />
          </Button>
        </nav>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
      {d.query.isError && (
        <div className="mt-3">
          <ErrorNote message={`Could not load your meals: ${d.query.error.message}`} onRetry={() => d.query.refetch()} />
        </div>
      )}

      <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        {MEALS.map((m) => (
          <MealBlock
            key={`${day}-${m.id}`}
            label={m.label}
            items={meals.filter((x) => x.meal === m.id)}
            onAdd={(title, calories) => {
              setError(null);
              d.add.mutate({ meal: m.id, title, calories });
            }}
            onRemove={(id) => d.remove.mutate(id)}
          />
        ))}
      </div>
    </Slip>
  );
}

function MealBlock({
  label,
  items,
  onAdd,
  onRemove,
}: {
  label: string;
  items: Meal[];
  onAdd: (title: string, calories: number | null) => void;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [kcal, setKcal] = useState("");
  const subtotal = items.reduce((s, m) => s + (m.calories ?? 0), 0);

  return (
    <section aria-label={label}>
      <div className="flex items-baseline justify-between border-b border-foreground/15 pb-1.5">
        <h4 className="font-serif text-lg leading-tight">{label}</h4>
        {subtotal > 0 && <span className="text-xs text-muted-foreground tabular-nums">{subtotal} kcal</span>}
      </div>
      <ul>
        {items.map((m) => (
          <li key={m.id} className="group flex min-h-9 items-center gap-2 border-b border-foreground/10 text-sm">
            <span className="min-w-0 flex-1 truncate" title={m.title}>
              {m.title}
            </span>
            {m.calories !== null && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{m.calories} kcal</span>}
            <button
              type="button"
              aria-label={`Remove ${m.title}`}
              disabled={m.id.startsWith("temp-")}
              onClick={() => onRemove(m.id)}
              className="shrink-0 p-1.5 text-muted-foreground opacity-50 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-1 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const t = title.trim();
          if (!t) return;
          const n = kcal === "" ? null : Math.round(Number(kcal));
          onAdd(t, n !== null && Number.isFinite(n) && n >= 0 && n <= 5000 ? n : null);
          setTitle("");
          setKcal("");
        }}
      >
        <input
          aria-label={`Add to ${label}`}
          placeholder="Add something…"
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(lineInput, "flex-1")}
        />
        <input
          aria-label={`Calories for ${label}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={5000}
          placeholder="kcal"
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
          className={cn(lineInput, "w-16 text-right")}
        />
        <Button type="submit" size="icon-sm" variant="ghost" aria-label={`Add to ${label}`} disabled={!title.trim()}>
          <Plus />
        </Button>
      </form>
    </section>
  );
}
