"use client";

import { useState } from "react";
import { Pin, PinOff, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoicePills } from "@/components/field";
import { formatAmount } from "@/features/fitness/format";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { HISTORY_DAYS, type Goal, type GoalInput, type GoalLog, type Milestone } from "./api";
import { isDone, pace, ratio } from "./pace";
import { Ring, amount, paceLine } from "./goal-parts";
import { MilestoneCheck } from "./goal-cards";
import { GoalForm } from "./goal-forms";

export function GoalDetail({
  goal: g,
  today,
  logs,
  milestones,
  advanced,
  saving,
  onSave,
  onPin,
  onRemove,
  onRemoveLog,
  onAddMilestone,
  onToggleMilestone,
  onRemoveMilestone,
}: {
  goal: Goal;
  today: string;
  logs: GoalLog[];
  milestones: Milestone[];
  advanced: boolean;
  saving: boolean;
  onSave: (v: GoalInput) => void;
  onPin: () => void;
  onRemove: () => void;
  onRemoveLog: (id: string) => void;
  onAddMilestone: (title: string) => void;
  onToggleMilestone: (m: Milestone) => void;
  onRemoveMilestone: (id: string) => void;
}) {
  const [tab, setTab] = useState<"journey" | "edit">("journey");
  const [newStep, setNewStep] = useState("");
  const p = pace(g, logs, today);

  return (
    <div className="space-y-4">
      <ChoicePills
        label="Section"
        options={[
          { value: "journey", label: "Journey" },
          { value: "edit", label: "Edit" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "edit" ? (
        <GoalForm initial={g} advanced={advanced} today={today} pending={saving} submit="Save changes" onSave={onSave} />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Ring value={ratio(g)} size={72} stroke={7}>
              <span className="text-sm font-semibold">{ratio(g) === null ? formatAmount(g.current_value) : `${Math.round(ratio(g)! * 100)}%`}</span>
            </Ring>
            <div className="min-w-0 text-sm">
              <p>
                {amount(g.current_value, g.unit)}
                {g.target_value ? ` of ${formatAmount(g.target_value)}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">{paceLine(g, p, today)}</p>
              {g.why && <p className="mt-1 font-hand text-lg leading-tight text-muted-foreground">because {g.why}</p>}
            </div>
          </div>

          {advanced && (
            <section>
              <p className="mb-2 text-xs font-semibold">Milestones</p>
              <ul className="space-y-1">
                {milestones.map((m) => (
                  <li key={m.id} className="group flex items-center gap-1">
                    <MilestoneCheck milestone={m} onToggle={() => onToggleMilestone(m)} />
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Remove ${m.title}`}
                      onClick={() => onRemoveMilestone(m.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newStep.trim()) return;
                  onAddMilestone(newStep);
                  setNewStep("");
                }}
              >
                <Input aria-label="New milestone" placeholder="Add a milestone…" maxLength={80} className="h-8 text-sm" value={newStep} onChange={(e) => setNewStep(e.target.value)} />
                <Button type="submit" size="icon-sm" variant="secondary" aria-label="Add milestone" disabled={!newStep.trim()}>
                  <Plus />
                </Button>
              </form>
            </section>
          )}

          {advanced && (
            <section>
              <p className="mb-2 text-xs font-semibold">History</p>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No steps logged in the last {HISTORY_DAYS / 7} weeks.</p>
              ) : (
                <ul className="max-h-56 divide-y overflow-y-auto">
                  {logs.map((l) => (
                    <li key={l.id} className="group flex items-center gap-2 py-1.5 text-sm">
                      <span className={cn("w-16 shrink-0 font-semibold tabular-nums", l.amount > 0 ? "text-primary" : "text-muted-foreground")}>
                        {l.amount > 0 ? "+" : ""}
                        {formatAmount(l.amount)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{l.note ?? ""}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(l.log_date, { day: "numeric", month: "short" })}</span>
                      <button
                        type="button"
                        aria-label="Remove this step"
                        onClick={() => onRemoveLog(l.id)}
                        className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {advanced && !isDone(g) && (
              <Button variant="outline" onClick={onPin}>
                {g.pinned ? <PinOff /> : <Pin />} {g.pinned ? "Unpin" : "Make it my focus"}
              </Button>
            )}
            <Button variant="destructive" onClick={onRemove} className="ml-auto">
              <Trash2 /> Remove goal
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
