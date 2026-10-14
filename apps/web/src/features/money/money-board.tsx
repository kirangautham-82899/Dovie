"use client";

import { useState } from "react";
import { CategoryDonut } from "@/components/charts";
import { CalendarClock, PiggyBank, Plus, ReceiptText, Target, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { Field, selectClass } from "@/components/field";
import { EmptyState, ErrorNote, SectionTitle } from "@/components/page-header";
import { EXPENSE_CATEGORIES, formatPaise, rupeesToPaise } from "@/lib/money";
import { addDays, daysBetween, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Recurrence } from "./api";
import { useMoney } from "./use-money";
import { MoneyForecastCard } from "./money-forecast";

type Dialog = null | "expense" | "bill" | "budget" | "goal" | { savingsFor: string; title: string };

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  yearly: "Yearly",
  once: "Just once",
};

function Progress({ value, over = false }: { value: number; over?: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div
        className={cn("h-full rounded-full transition-all", over ? "bg-destructive/70" : "bg-primary")}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

export function MoneyBoard({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const m = useMoney(today, setError);
  const close = () => setDialog(null);

  if (m.query.isPending) return <p className="text-sm text-muted-foreground">Gathering your numbers…</p>;
  if (m.query.isError)
    return <ErrorNote message={`Could not load your money: ${m.query.error.message}`} onRetry={() => m.query.refetch()} />;

  const { expenses, bills, budgets, goals } = m.query.data;
  const spent = expenses.reduce((s, e) => s + e.amount_paise, 0);
  const upcoming = bills.filter((b) => daysBetween(today, b.due_date) <= 30);
  const upcomingTotal = upcoming.reduce((s, b) => s + (b.amount_paise ?? 0), 0);
  const saved = goals.reduce((s, g) => s + g.saved_paise, 0);
  const target = goals.reduce((s, g) => s + g.target_paise, 0);

  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount_paise);
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const monthName = formatDate(today, { month: "long" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialog("expense")}>
          <Plus /> Add expense
        </Button>
        <Button variant="secondary" onClick={() => setDialog("bill")}>
          Add a bill
        </Button>
        <Button variant="secondary" onClick={() => setDialog("budget")}>
          Set a budget
        </Button>
        <Button variant="secondary" onClick={() => setDialog("goal")}>
          Make a money goal
        </Button>
      </div>

      {error && <ErrorNote message={error} />}

      <div className="ruled sm:grid-cols-3">
        <StatTile
          label="Spent this month"
          value={formatPaise(spent)}
          caption={`From expenses you added in ${monthName}`}
          tone="rose"
          icon={ReceiptText}
        />
        <StatTile
          label="Bills coming up"
          value={formatPaise(upcomingTotal)}
          caption={`${upcoming.length} in the next 30 days`}
          tone="peach"
          icon={CalendarClock}
        />
        <StatTile
          label="A little saved"
          value={formatPaise(saved)}
          caption={target ? `of ${formatPaise(target)} across your money goals` : "Across your money goals"}
          tone="lilac"
          icon={PiggyBank}
        />
      </div>

      <div className="ruled lg:grid-cols-2">
        <MoneyForecastCard today={today} data={m.query.data} />
        <Card>
          <SectionTitle icon={CalendarClock} title="Bills & regular things" />
          {bills.length === 0 ? (
            <EmptyState title="Bills, when you're ready" detail="Add due dates so you can see what's coming, all in one place." />
          ) : (
            <ul className="divide-y">
              {bills.map((b) => {
                const overdue = b.due_date < today;
                return (
                  <li key={b.id} className="group flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.title}</p>
                      <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                        {formatDate(b.due_date, { day: "numeric", month: "short" })} · {relativeDay(b.due_date, today)} ·{" "}
                        {RECURRENCE_LABEL[b.recurrence]}
                      </p>
                    </div>
                    {b.amount_paise !== null && <span className="text-sm">{formatPaise(b.amount_paise)}</span>}
                    <Button size="sm" variant="outline" onClick={() => m.markPaid.mutate(b.id)} disabled={m.markPaid.isPending}>
                      Mark paid
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${b.title}`}
                      onClick={() => confirm(`Remove "${b.title}"?`) && m.deleteBill.mutate(b.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle icon={ReceiptText} title="Recent spending" />
          {expenses.length === 0 ? (
            <EmptyState
              title="Your spending, without the guesswork"
              detail="Add expenses as they happen. Dovie doesn't connect to banks."
            />
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto">
              {expenses.slice(0, 30).map((e) => (
                <li key={e.id} className="group flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{e.note || e.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.category} · {formatDate(e.spent_on, { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{formatPaise(e.amount_paise)}</span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove expense"
                    onClick={() => m.deleteExpense.mutate(e.id)}
                    className="opacity-60 group-hover:opacity-100"
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle icon={Wallet} title="Where it went" />
          {categories.length === 0 ? (
            <EmptyState title="A picture will emerge" detail="Add a few expenses to see your own spending mix." />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="size-40 shrink-0" aria-hidden>
                <CategoryDonut data={categories.map(([name, value]) => ({ name, value }))} colors={CHART_COLORS} />
              </div>
              <ul className="w-full space-y-1.5 text-sm">
                {categories.map(([name, value], i) => (
                  <li key={name} className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      aria-hidden
                    />
                    <span className="flex-1">{name}</span>
                    <span className="text-muted-foreground">{Math.round((value / spent) * 100)}%</span>
                    <span className="w-24 text-right">{formatPaise(value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon={Target} title="Monthly budgets" />
          {budgets.length === 0 ? (
            <EmptyState title="Budgets without judgment" detail="Set a monthly boundary that works for you." />
          ) : (
            <ul className="space-y-4">
              {budgets.map((b) => {
                const used = byCategory.get(b.category) ?? 0;
                const ratio = used / b.monthly_limit_paise;
                return (
                  <li key={b.id} className="group space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{b.category}</span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        {formatPaise(used)} of {formatPaise(b.monthly_limit_paise)}
                        <button
                          type="button"
                          aria-label={`Remove ${b.category} budget`}
                          onClick={() => m.deleteBudget.mutate(b.id)}
                          className="rounded p-1 opacity-60 hover:bg-muted group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    </div>
                    <Progress value={ratio} over={ratio > 1} />
                    {ratio > 1 ? (
                      <p className="text-xs text-muted-foreground">
                        A little over this month. That happens; next month is a fresh page.
                      </p>
                    ) : ratio >= 0.8 ? (
                      <p className="text-xs text-muted-foreground">Getting close. A gentle heads-up.</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle icon={PiggyBank} title="Money goals" />
          {goals.length === 0 ? (
            <EmptyState title="Something to look forward to" detail="A money goal can be tiny or far away." />
          ) : (
            <ul className="ruled sm:[&>li:last-child:nth-child(odd)]:col-span-2 sm:grid-cols-2">
              {goals.map((g) => (
                <li key={g.id} className="group space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{g.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPaise(g.saved_paise)} of {formatPaise(g.target_paise)}
                        {g.target_date && ` · by ${formatDate(g.target_date, { day: "numeric", month: "short", year: "numeric" })}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${g.title}`}
                      onClick={() => confirm(`Remove "${g.title}"?`) && m.deleteGoal.mutate(g.id)}
                      className="rounded p-1 text-muted-foreground opacity-60 hover:bg-muted group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <Progress value={g.saved_paise / g.target_paise} />
                  <Button size="sm" variant="secondary" onClick={() => setDialog({ savingsFor: g.id, title: g.title })}>
                    Add savings
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Dovie is for tracking only and is not financial advice. It never connects to your bank, cards or messages.
      </p>

      <Modal open={dialog === "expense"} title="Add an expense" onClose={close}>
        <ExpenseForm today={today} onSave={(v) => m.addExpense.mutate(v, { onSuccess: close })} />
      </Modal>
      <Modal open={dialog === "bill"} title="Add a bill" onClose={close}>
        <BillForm today={today} onSave={(v) => m.addBill.mutate(v, { onSuccess: close })} />
      </Modal>
      <Modal open={dialog === "budget"} title="Set a monthly budget" onClose={close}>
        <BudgetForm onSave={(v) => m.setBudget.mutate(v, { onSuccess: close })} />
      </Modal>
      <Modal open={dialog === "goal"} title="Make a money goal" onClose={close}>
        <GoalForm today={today} onSave={(v) => m.addGoal.mutate(v, { onSuccess: close })} />
      </Modal>
      <Modal
        open={typeof dialog === "object" && dialog !== null}
        title={typeof dialog === "object" && dialog ? `Add to ${dialog.title}` : ""}
        onClose={close}
      >
        <AmountForm
          label="How much did you set aside?"
          submit="Add savings"
          onSave={(amount) =>
            typeof dialog === "object" && dialog && m.addSavings.mutate({ id: dialog.savingsFor, amount }, { onSuccess: close })
          }
        />
      </Modal>
    </div>
  );
}

function useAmount() {
  const [raw, setRaw] = useState("");
  return { raw, setRaw, paise: rupeesToPaise(raw) };
}

function AmountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
      <Input
        inputMode="decimal"
        placeholder="0"
        className="pl-7"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ExpenseForm({
  today,
  onSave,
}: {
  today: string;
  onSave: (v: { amount_paise: number; category: string; note: string; spent_on: string }) => void;
}) {
  const amount = useAmount();
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<string>("Everyday");
  const [date, setDate] = useState(today);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount.paise) onSave({ amount_paise: amount.paise, category, note, spent_on: date });
      }}
    >
      <Field label="What was it?">
        <Input placeholder="Lunch with a friend" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          <AmountInput value={amount.raw} onChange={amount.setRaw} />
        </Field>
        <Field label="Category">
          <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="When">
        <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={!amount.paise || !date}>
        Save
      </Button>
    </form>
  );
}

function BillForm({
  today,
  onSave,
}: {
  today: string;
  onSave: (v: { title: string; amount_paise: number | null; due_date: string; recurrence: Recurrence }) => void;
}) {
  const amount = useAmount();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(addDays(today, 7));
  const [recurrence, setRecurrence] = useState<Recurrence>("monthly");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim() && due) onSave({ title, amount_paise: amount.paise, due_date: due, recurrence });
      }}
    >
      <Field label="Bill name">
        <Input placeholder="Internet" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" hint="Optional">
          <AmountInput value={amount.raw} onChange={amount.setRaw} />
        </Field>
        <Field label="Due date">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <Field label="Repeats">
        <select className={selectClass} value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
          {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => (
            <option key={r} value={r}>
              {RECURRENCE_LABEL[r]}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={!title.trim() || !due || (amount.raw !== "" && !amount.paise)}>
        Save
      </Button>
    </form>
  );
}

function BudgetForm({ onSave }: { onSave: (v: { category: string; limit: number }) => void }) {
  const amount = useAmount();
  const [category, setCategory] = useState<string>("Food");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount.paise) onSave({ category, limit: amount.paise });
      }}
    >
      <Field label="Category">
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Monthly limit" hint="Setting a category again replaces its limit.">
        <AmountInput value={amount.raw} onChange={amount.setRaw} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={!amount.paise}>
        Save
      </Button>
    </form>
  );
}

function GoalForm({
  today,
  onSave,
}: {
  today: string;
  onSave: (v: { title: string; target_paise: number; target_date: string | null }) => void;
}) {
  const amount = useAmount();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim() && amount.paise) onSave({ title, target_paise: amount.paise, target_date: date || null });
      }}
    >
      <Field label="What are you saving for?">
        <Input placeholder="A weekend away" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target amount">
          <AmountInput value={amount.raw} onChange={amount.setRaw} />
        </Field>
        <Field label="By when" hint="Optional">
          <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={!title.trim() || !amount.paise}>
        Save
      </Button>
    </form>
  );
}

function AmountForm({ label, submit, onSave }: { label: string; submit: string; onSave: (paise: number) => void }) {
  const amount = useAmount();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount.paise) onSave(amount.paise);
      }}
    >
      <Field label={label}>
        <AmountInput value={amount.raw} onChange={amount.setRaw} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={!amount.paise}>
        {submit}
      </Button>
    </form>
  );
}
