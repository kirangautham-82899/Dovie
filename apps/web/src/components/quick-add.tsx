"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/field";
import { Modal } from "@/components/modal";
import { useProfile } from "@/features/settings/use-profile";
import { useTasks } from "@/features/tasks/use-tasks";
import { MAX_TITLE_LENGTH } from "@/features/tasks/types";
import { useMoney } from "@/features/money/use-money";
import { EXPENSE_CATEGORIES, rupeesToPaise } from "@/lib/money";
import { todayInTimezone } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Screens that already have their own focused input (a live workout, a journal
// page) or no daily capture at all keep the screen clear of the button.
const HIDDEN_ON = ["/fitness", "/journal", "/settings"];

const noopSubscribe = () => () => {};

/** False while the server renders and while the client hydrates, true after. */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type Kind = "task" | "expense";

function QuickAddForm({ today }: { today: string }) {
  const [kind, setKind] = useState<Kind>("task");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>("Everyday");
  const [note, setNote] = useState("");

  const { add } = useTasks(today, setError);
  const { addExpense } = useMoney(today, setError);

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setError(null);
    add.mutate(
      { title: value, isPriority: false },
      {
        onSuccess: () => {
          setTitle("");
          setDone("Added to today.");
        },
      },
    );
  }

  function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    const paise = rupeesToPaise(amount);
    if (paise === null) {
      setError("Enter an amount like 250 or 99.50.");
      return;
    }
    setError(null);
    addExpense.mutate(
      { amount_paise: paise, category, note, spent_on: today },
      {
        onSuccess: () => {
          setAmount("");
          setNote("");
          setDone("Expense saved.");
        },
      },
    );
  }

  function pick(next: Kind) {
    setKind(next);
    setError(null);
    setDone(null);
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="What to add" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["task", "expense"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => pick(k)}
            className={cn(
              "rounded-full py-1.5 text-sm font-semibold transition-colors",
              kind === k ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {k === "task" ? "A plan" : "An expense"}
          </button>
        ))}
      </div>

      {kind === "task" ? (
        <form onSubmit={submitTask} className="space-y-3">
          <Field label="What's on your mind for today?">
            <Input
              autoFocus
              maxLength={MAX_TITLE_LENGTH}
              placeholder="Add a small plan…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="solid" className="w-full" disabled={add.isPending || !title.trim()}>
            Add plan
          </Button>
        </form>
      ) : (
        <form onSubmit={submitExpense} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹)">
              <Input
                autoFocus
                inputMode="decimal"
                placeholder="250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Category">
              <select
                className={selectClass}
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof EXPENSE_CATEGORIES)[number])}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Note (optional)">
            <Input maxLength={80} placeholder="Chai with Asha" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button type="submit" variant="solid" className="w-full" disabled={addExpense.isPending || !amount.trim()}>
            Save expense
          </Button>
        </form>
      )}

      <p aria-live="polite" className="min-h-5 text-sm">
        {error ? (
          <span role="alert" className="text-destructive">
            {error}
          </span>
        ) : (
          done && <span className="text-mint-foreground">{done}</span>
        )}
      </p>
    </div>
  );
}

/**
 * A "+" button that floats over every daily screen, so the two most common
 * entries (a plan, an expense) take a few seconds from wherever you are.
 */
export function QuickAdd() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const profile = useProfile().query.data;

  // The saved query cache can already hold the profile on the client, but the
  // server never has it. Render nothing until hydration is done so both match.
  if (!hydrated || !profile?.onboarded_at || HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const today = todayInTimezone(profile.timezone);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick add"
        className="fixed right-4 bottom-20 z-40 flex size-12 items-center justify-center rounded-full bg-secondary-foreground text-card shadow-soft transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-secondary-foreground/40 focus-visible:outline-none active:translate-y-0 lg:right-6 lg:bottom-6"
      >
        <Plus className="size-5" />
      </button>
      <Modal open={open} title="Quick add" onClose={() => setOpen(false)}>
        <QuickAddForm today={today} />
      </Modal>
    </>
  );
}
