"use client";

import { useMutation } from "@tanstack/react-query";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/page-header";
import type { Insight } from "@/lib/ai-insight";

async function ask(endpoint: string, payload: unknown): Promise<Insight> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? "Dovie couldn't answer just now.");
  if (!body || typeof body.headline !== "string" || !Array.isArray(body.observations)) {
    throw new Error("Dovie's answer came back garbled. Please try again.");
  }
  return body as Insight;
}

/** The "Ask Dovie" button and its answer. Only runs when pressed. */
export function AskDovie({
  endpoint,
  payload,
  label,
  disclosure,
}: {
  endpoint: string;
  /** Built at click time, so it always reflects what's on screen. */
  payload: () => unknown;
  label: string;
  disclosure: string;
}) {
  const insight = useMutation({ mutationFn: () => ask(endpoint, payload()) });

  if (insight.isIdle) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => insight.mutate()}>
          <Sparkles /> {label}
        </Button>
        <p className="max-w-md text-xs text-muted-foreground">{disclosure}</p>
      </div>
    );
  }
  if (insight.isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Dovie is reading your numbers…
      </p>
    );
  }
  if (insight.isError) return <ErrorNote message={insight.error.message} onRetry={() => insight.mutate()} />;

  const data = insight.data;
  return (
    <div className="animate-rise space-y-3 border-l-2 border-primary pl-4">
      <p className="font-serif text-xl leading-snug">{data.headline}</p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {data.observations.map((o) => (
          <li key={o} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            {o}
          </li>
        ))}
      </ul>
      <p className="flex gap-2 text-sm">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
        {data.nudge}
      </p>
      <button
        type="button"
        onClick={() => insight.mutate()}
        className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
      >
        Ask again
      </button>
    </div>
  );
}
