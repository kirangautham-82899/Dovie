"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoicePills, Field } from "@/components/field";
import { formatAmount } from "@/features/fitness/format";
import { cn } from "@/lib/utils";
import { AREAS, type Area, type Goal, type GoalInput } from "./api";
import { IDEAS, type Idea } from "./goals-notebook";

export function LogForm({
  goal,
  today,
  advanced,
  pending,
  onSave,
}: {
  goal: Goal;
  today: string;
  advanced: boolean;
  pending: boolean;
  onSave: (v: { amount: number; note?: string; date?: string }) => void;
}) {
  const [value, setValue] = useState(formatAmount(goal.step));
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const n = Number(value);
  const valid = value !== "" && Number.isFinite(n) && n !== 0 && Math.abs(n) <= 1_000_000_000;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ amount: n, note: note.trim() || undefined, date });
      }}
    >
      <Field label={`How much${goal.unit ? ` (${goal.unit})` : ""}?`} hint="Use a minus to take some back.">
        <div className="flex gap-2">
          <Input type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          {[1, 2, 5].map((k) => (
            <Button key={k} type="button" variant="secondary" onClick={() => setValue(formatAmount(goal.step * k))}>
              {formatAmount(goal.step * k)}
            </Button>
          ))}
        </div>
      </Field>
      {advanced && (
        <>
          <Field label="A note" hint="Optional">
            <Input placeholder="Finished chapter 9 on the train" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Field label="When">
            <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </>
      )}
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!valid}>
        Log it
      </Button>
    </form>
  );
}

export function GoalForm({
  initial,
  seed,
  advanced,
  today,
  pending,
  submit,
  onSave,
}: {
  initial?: Goal;
  seed?: Idea;
  advanced: boolean;
  today: string;
  pending: boolean;
  submit: string;
  onSave: (v: GoalInput & { milestones: string[] }) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? seed?.title ?? "");
  const [area, setArea] = useState<Area | null>(initial?.area ?? seed?.area ?? null);
  const startTarget = initial ? initial.target_value : seed?.target;
  const [target, setTarget] = useState(startTarget != null ? String(startTarget) : "");
  const [unit, setUnit] = useState(initial?.unit ?? seed?.unit ?? "");
  const [stepRaw, setStepRaw] = useState(String(initial?.step ?? seed?.step ?? 1));
  const [date, setDate] = useState(initial?.target_date ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [steps, setSteps] = useState("");
  const targetNum = target === "" ? null : Number(target);
  const stepNum = Number(stepRaw);
  const valid =
    title.trim() &&
    (targetNum === null || (targetNum > 0 && targetNum <= 1_000_000_000)) &&
    Number.isFinite(stepNum) &&
    stepNum > 0 &&
    (!date || targetNum !== null);

  const pickIdea = (idea: Idea) => {
    setTitle(idea.title);
    setArea(idea.area ?? null);
    setTarget(idea.target != null ? String(idea.target) : "");
    setUnit(idea.unit ?? "");
    setStepRaw(String(idea.step ?? 1));
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          onSave({
            title,
            area,
            target: targetNum,
            unit,
            step: stepNum,
            target_date: date,
            why,
            milestones: steps.split("\n"),
          });
      }}
    >
      {!initial && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5 text-primary" /> Start from an idea
          </p>
          <div className="flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => (
              <button
                key={idea.title}
                type="button"
                onClick={() => pickIdea(idea)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-secondary",
                  title === idea.title && "border-primary bg-secondary",
                )}
              >
                {idea.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <Field label="What are you growing toward?">
        <Input placeholder="Read 12 books this year" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div>
        <p className="mb-2 text-xs font-semibold">Area</p>
        <ChoicePills label="Area" options={AREAS} value={area} onChange={setArea} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Target" hint="Optional">
          <Input type="number" inputMode="decimal" min={0} value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="Unit" hint="Optional">
          <Input placeholder="books" maxLength={20} value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <Field label="One step" hint="Per tap">
          <Input type="number" inputMode="decimal" min={0} value={stepRaw} onChange={(e) => setStepRaw(e.target.value)} />
        </Field>
      </div>
      {advanced && (
        <>
          <Field label="By when" hint={targetNum === null ? "Needs a target" : "Optional"}>
            <Input type="date" min={today} value={date} disabled={targetNum === null} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Why it matters" hint="Optional. Shown on your focus card.">
            <Input placeholder="I want evenings that feel like mine" maxLength={200} value={why} onChange={(e) => setWhy(e.target.value)} />
          </Field>
          {!initial && (
            <Field label="Milestones" hint="Optional, one per line">
              <textarea
                rows={3}
                placeholder={"Finish the first book\nJoin a book club"}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
          )}
        </>
      )}
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!valid}>
        {submit}
      </Button>
    </form>
  );
}
