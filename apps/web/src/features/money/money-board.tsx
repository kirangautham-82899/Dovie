"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Check, PiggyBank, Plus, ReceiptText, Target, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slip, Sticky, StickyValue } from "@/components/notebook";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal";
import { ChoicePills, Field, selectClass } from "@/components/field";
import { EmptyState, ErrorNote, PageHeader, SectionTitle } from "@/components/page-header";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, formatPaise, rupeesToPaise } from "@/lib/money";
import { addDays, daysBetween, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Recurrence } from "./api";
import { useMoney } from "./use-money";
import { FORECAST_STATUS, MoneyForecastCard } from "./money-forecast";
import { forecastMoney } from "./forecast";
import { SavingsCoach } from "./savings-coach";
import { MoodMoneyCard } from "./mood-money-card";
import { expectedIncome } from "./savings";

type Dialog = null | "income" | "expense" | "bill" | "budget" | "goal" | { savingsFor: string; title: string };

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  yearly: "Yearly",
  once: "Just once",
};

function Progress({ value, over = false, muted = false }: { value: number; over?: boolean; muted?: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div
        className={cn("h-full rounded-full transition-all", over ? "bg-destructive/70" : muted ? "bg-primary/40" : "bg-primary")}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

/** Header copy, shared with the loading skeleton so the page doesn't jump. */
export const MONEY_HEADER = {
  eyebrow: "money, gently",
  title: "Know where you",
  accent: "stand.",
};

/** Cards on the money page are a little tighter than the default. */
const dense = "p-4 sm:p-5";

/** Sticky notes show whole rupees; the lists below keep the paise. */
const whole = (paise: number) => formatPaise(Math.round(paise / 100) * 100);

const LEDGER_FILTERS = [
  { value: "all", label: "All" },
  { value: "in", label: "In" },
  { value: "out", label: "Out" },
] as const;
type LedgerFilter = (typeof LEDGER_FILTERS)[number]["value"];

type LedgerRow = { id: string; kind: "in" | "out"; title: string; tag: string; date: string; amount: number };

function StatusPill({ status }: { status: keyof typeof FORECAST_STATUS }) {
  const s = FORECAST_STATUS[status];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", s.className)}>{s.label}</span>;
}

/** Planning actions, grouped apart from the everyday in/out buttons. */
const PLAN_ACTIONS = [
  { dialog: "bill", label: "Bill", icon: CalendarClock },
  { dialog: "budget", label: "Budget", icon: Target },
  { dialog: "goal", label: "Goal", icon: PiggyBank },
] as const;

/** Quiet until the row is hovered or focused; always shown on touch screens, which can't hover. */
function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition outline-none group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-destructive/25 [@media(hover:hover)]:opacity-0"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

export function MoneyBoard({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const m = useMoney(today, setError);
  const close = () => setDialog(null);
  const data = m.query.data;
  const f = useMemo(
    () =>
      data &&
      forecastMoney({
        today,
        month: data.expenses,
        history: data.history,
        bills: data.bills,
        budgets: data.budgets,
        goals: data.goals,
      }),
    [today, data],
  );
  const monthName = formatDate(today, { month: "long" });
  const incomeReady = data?.incomeReady !== false;

  const header = (
    <PageHeader
      compact
      {...MONEY_HEADER}
      eyebrow={`money, gently · ${monthName}`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {incomeReady && (
            <Button
              onClick={() => setDialog("income")}
              className="bg-mint text-mint-foreground shadow-soft hover:-translate-y-px hover:brightness-[0.97] active:translate-y-0"
            >
              <ArrowDownLeft /> Income
            </Button>
          )}
          <Button variant="solid" onClick={() => setDialog("expense")}>
            <ArrowUpRight /> Expense
          </Button>
          <div role="group" aria-label="Plan ahead" className="flex items-center rounded-full border bg-card/80 p-0.5 shadow-soft">
            {PLAN_ACTIONS.map((a) => (
              <Button
                key={a.dialog}
                size="sm"
                variant="ghost"
                onClick={() => setDialog(a.dialog)}
                className="h-8 px-3 text-muted-foreground hover:text-foreground"
              >
                <a.icon /> {a.label}
              </Button>
            ))}
          </div>
        </div>
      }
    />
  );

  if (m.query.isPending)
    return (
      <>
        {header}
        <p className="text-sm text-muted-foreground">Gathering your numbers…</p>
      </>
    );
  if (m.query.isError || !data || !f)
    return (
      <>
        {header}
        <ErrorNote message={`Could not load your money: ${m.query.error?.message}`} onRetry={() => m.query.refetch()} />
      </>
    );

  const { expenses, bills, budgets, goals, income } = data;
  const earned = income.reduce((s, i) => s + i.amount_paise, 0);
  const expected = expectedIncome(data);
  const spent = expenses.reduce((s, e) => s + e.amount_paise, 0);
  // Money in so far, minus money out so far and bills still to pay this month.
  const left = earned - spent - f.billsDueThisMonth;
  const saved = goals.reduce((s, g) => s + g.saved_paise, 0);
  const target = goals.reduce((s, g) => s + g.target_paise, 0);
  const upcoming = bills.filter((b) => daysBetween(today, b.due_date) <= 30);

  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount_paise);
  // Every category with spending or a budget, biggest first.
  const categories = [...new Set([...byCategory.keys(), ...budgets.map((b) => b.category)])]
    .map((name) => ({
      name,
      spent: byCategory.get(name) ?? 0,
      budget: budgets.find((b) => b.category === name) ?? null,
      status: f.categories.find((c) => c.category === name)?.status,
    }))
    .sort((a, b) => b.spent - a.spent);
  const topSpend = Math.max(1, ...categories.map((c) => c.spent));
  const goalForecast = new Map(f.goals.map((g) => [g.id, g]));

  const ledger: LedgerRow[] = [
    ...income.map((i) => ({ id: i.id, kind: "in" as const, title: i.note || i.source, tag: i.source, date: i.received_on, amount: i.amount_paise })),
    ...expenses.map((e) => ({ id: e.id, kind: "out" as const, title: e.note || e.category, tag: e.category, date: e.spent_on, amount: e.amount_paise })),
  ]
    .filter((r) => filter === "all" || r.kind === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      {header}

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 md:grid-cols-4">
        <Sticky
          label="Earned"
          icon={ArrowDownLeft}
          caption={
            !incomeReady
              ? "coming soon"
              : expected && expected > earned
                ? `usually ~${whole(expected)}`
                : earned
                  ? `in ${monthName}`
                  : "add what came in"
          }
          tilt="-rotate-1 [--tape-tilt:-4deg]"
          tone="bg-mint text-mint-foreground"
        >
          <StickyValue value={whole(earned)} className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Spent"
          icon={ArrowUpRight}
          caption={earned ? `${Math.round((spent / earned) * 100)}% of what came in` : `so far in ${monthName}`}
          tilt="rotate-1 [--tape-tilt:3deg]"
          tone="bg-secondary text-secondary-foreground"
        >
          <StickyValue value={whole(spent)} className="text-3xl sm:text-4xl" />
        </Sticky>
        <Sticky
          label="Left"
          icon={Wallet}
          caption={
            !earned
              ? "add income to see"
              : f.billsDueThisMonth
                ? `after ${whole(f.billsDueThisMonth)} of bills`
                : left >= 0
                  ? "yours to plan"
                  : "spending passed income"
          }
          tilt="-rotate-[0.5deg] [--tape-tilt:-2deg]"
          tone="bg-butter text-butter-foreground"
        >
          <StickyValue
            value={earned ? whole(left) : "–"}
            className={cn("text-3xl sm:text-4xl", earned && left < 0 && "text-destructive")}
          />
        </Sticky>
        <Sticky
          label="Saved"
          icon={PiggyBank}
          caption={target ? `of ${whole(target)} in goals` : "a little adds up"}
          tilt="rotate-[1.5deg] [--tape-tilt:4deg]"
          tone="bg-sky text-sky-foreground"
        >
          <StickyValue value={whole(saved)} className="text-3xl sm:text-4xl" />
        </Sticky>
      </div>

      <div className="mt-8 space-y-5">
        <Slip>
          <MoneyForecastCard today={today} data={data} forecast={f} incomePaise={expected} />
        </Slip>

        <Slip>
          <MoodMoneyCard today={today} data={data} />
        </Slip>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-5">
            <Slip>
              <Card className={dense}>
                <SectionTitle
                  icon={ReceiptText}
                  title={`${monthName} so far`}
                  aside={incomeReady && <ChoicePills label="Show" options={LEDGER_FILTERS} value={filter} onChange={setFilter} />}
                />
                {ledger.length === 0 ? (
                  <EmptyState
                    title={filter === "in" ? "Nothing in yet" : filter === "out" ? "Nothing spent yet" : "A fresh page"}
                    detail="Add income and expenses as they happen. Dovie never connects to banks."
                  >
                    <div className="flex flex-wrap gap-2">
                      {filter !== "in" && (
                        <Button size="sm" variant="secondary" onClick={() => setDialog("expense")}>
                          <Plus /> Expense
                        </Button>
                      )}
                      {incomeReady && filter !== "out" && (
                        <Button size="sm" variant="outline" onClick={() => setDialog("income")}>
                          <Plus /> Income
                        </Button>
                      )}
                    </div>
                  </EmptyState>
                ) : (
                  <ul className="max-h-96 divide-y overflow-y-auto">
                    {ledger.map((r) => (
                      <li key={r.id} className="group flex items-center gap-2.5 py-2">
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full",
                            r.kind === "in" ? "bg-mint text-mint-foreground" : "bg-secondary text-secondary-foreground",
                          )}
                        >
                          {r.kind === "in" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{r.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.tag} · {formatDate(r.date, { day: "numeric", month: "short" })}
                          </p>
                        </div>
                        <span className={cn("text-sm font-medium tabular-nums", r.kind === "in" && "text-mint-foreground")}>
                          {r.kind === "in" ? "+" : "−"}
                          {formatPaise(r.amount)}
                        </span>
                        <RemoveButton
                          label={r.kind === "in" ? "Remove income" : "Remove expense"}
                          onClick={() => (r.kind === "in" ? m.deleteIncome : m.deleteExpense).mutate(r.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </Slip>

            <Slip>
              <Card className={dense}>
                <SectionTitle icon={PiggyBank} title="Money goals" />
                {goals.length === 0 ? (
                  <EmptyState title="Something to look forward to" detail="A money goal can be tiny or far away.">
                    <Button size="sm" variant="secondary" onClick={() => setDialog("goal")}>
                      <PiggyBank /> Make a goal
                    </Button>
                  </EmptyState>
                ) : (
                  <ul className="space-y-3">
                    {goals.map((g) => {
                      const gf = goalForecast.get(g.id);
                      return (
                        <li key={g.id} className="group space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{g.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatPaise(g.saved_paise)} of {formatPaise(g.target_paise)}
                                {g.target_date && ` · by ${formatDate(g.target_date, { day: "numeric", month: "short", year: "numeric" })}`}
                                {gf?.eta && gf.status !== "done" && ` · ~${formatDate(gf.eta, { month: "short", year: "numeric" })}`}
                              </p>
                            </div>
                            {gf && gf.status !== "no-data" && <StatusPill status={gf.status} />}
                            <Button
                              size="sm"
                              variant="secondary"
                              aria-label={`Add savings to ${g.title}`}
                              onClick={() => setDialog({ savingsFor: g.id, title: g.title })}
                            >
                              <Plus /> Add
                            </Button>
                            <RemoveButton
                              label={`Remove ${g.title}`}
                              onClick={() => confirm(`Remove "${g.title}"?`) && m.deleteGoal.mutate(g.id)}
                            />
                          </div>
                          <Progress value={g.saved_paise / g.target_paise} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </Slip>
          </div>

          <div className="min-w-0 space-y-5">
            <Slip>
              <Card className={dense}>
                <SectionTitle icon={Target} title="Where it went" />
                {categories.length === 0 ? (
                  <EmptyState title="A picture will emerge" detail="Add a few expenses, or set a budget for a category.">
                    <Button size="sm" variant="secondary" onClick={() => setDialog("budget")}>
                      <Target /> Set a budget
                    </Button>
                  </EmptyState>
                ) : (
                  <ul className="space-y-3">
                    {categories.map((c) => {
                      const ratio = c.budget ? c.spent / c.budget.monthly_limit_paise : c.spent / topSpend;
                      return (
                        <li key={c.name} className="group space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                            {c.status && c.status !== "no-budget" && <StatusPill status={c.status} />}
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatPaise(c.spent)}
                              {c.budget
                                ? ` of ${formatPaise(c.budget.monthly_limit_paise)}`
                                : spent > 0 && ` · ${Math.round((c.spent / spent) * 100)}%`}
                            </span>
                            {c.budget && (
                              <RemoveButton label={`Remove ${c.name} budget`} onClick={() => m.deleteBudget.mutate(c.budget!.id)} />
                            )}
                          </div>
                          <Progress value={ratio} over={!!c.budget && ratio > 1} muted={!c.budget} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </Slip>

            <Slip>
              <Card className={dense}>
                <SectionTitle
                  icon={CalendarClock}
                  title="Bills"
                  aside={
                    upcoming.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatPaise(upcoming.reduce((s, b) => s + (b.amount_paise ?? 0), 0))} in 30 days
                      </span>
                    )
                  }
                />
                {bills.length === 0 ? (
                  <EmptyState title="Bills, when you're ready" detail="Add due dates so nothing sneaks up on you.">
                    <Button size="sm" variant="secondary" onClick={() => setDialog("bill")}>
                      <CalendarClock /> Add a bill
                    </Button>
                  </EmptyState>
                ) : (
                  <ul className="divide-y">
                    {bills.map((b) => {
                      const overdue = b.due_date < today;
                      return (
                        <li key={b.id} className="group flex items-center gap-2 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{b.title}</p>
                            <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                              {relativeDay(b.due_date, today)} · {RECURRENCE_LABEL[b.recurrence]}
                            </p>
                          </div>
                          {b.amount_paise !== null && <span className="text-sm tabular-nums">{formatPaise(b.amount_paise)}</span>}
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={`Mark ${b.title} paid`}
                            onClick={() => m.markPaid.mutate(b.id)}
                            loading={m.markPaid.isPending && m.markPaid.variables === b.id}
                            className="hover:border-mint-foreground/30 hover:bg-mint hover:text-mint-foreground"
                          >
                            {!(m.markPaid.isPending && m.markPaid.variables === b.id) && <Check />} Paid
                          </Button>
                          <RemoveButton
                            label={`Remove ${b.title}`}
                            onClick={() => confirm(`Remove "${b.title}"?`) && m.deleteBill.mutate(b.id)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </Slip>
          </div>
        </div>

        <Slip>
          <SavingsCoach today={today} data={data} incomePaise={expected} />
        </Slip>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        For tracking and planning only, not financial advice. Forecasts are estimates from your own entries. Dovie never
        connects to your bank, cards or messages.
      </p>

      <Modal open={dialog === "income"} title="Add income" onClose={close}>
        <IncomeForm today={today} pending={m.addIncome.isPending} onSave={(v) => m.addIncome.mutate(v, { onSuccess: close })} />
      </Modal>
      <Modal open={dialog === "expense"} title="Add an expense" onClose={close}>
        <ExpenseForm today={today} pending={m.addExpense.isPending} onSave={(v) => m.addExpense.mutate(v, { onSuccess: close })} />
      </Modal>
      <Modal open={dialog === "bill"} title="Add a bill" onClose={close}>
        <BillForm today={today} pending={m.addBill.isPending} onSave={(v) => m.addBill.mutate(v, { onSuccess: close })} />
      </Modal>
      <Modal open={dialog === "budget"} title="Set a monthly budget" onClose={close}>
        <BudgetForm pending={m.setBudget.isPending} onSave={(v) => m.setBudget.mutate(v, { onSuccess: close })} />
      </Modal>
      <Modal open={dialog === "goal"} title="Make a money goal" onClose={close}>
        <GoalForm today={today} pending={m.addGoal.isPending} onSave={(v) => m.addGoal.mutate(v, { onSuccess: close })} />
      </Modal>
      <Modal
        open={typeof dialog === "object" && dialog !== null}
        title={typeof dialog === "object" && dialog ? `Add to ${dialog.title}` : ""}
        onClose={close}
      >
        <AmountForm
          label="How much did you set aside?"
          submit="Add savings"
          pending={m.addSavings.isPending}
          onSave={(amount) =>
            typeof dialog === "object" && dialog && m.addSavings.mutate({ id: dialog.savingsFor, amount }, { onSuccess: close })
          }
        />
      </Modal>
    </>
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
  pending,
  onSave,
}: {
  today: string;
  pending?: boolean;
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
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!amount.paise || !date}>
        Add expense
      </Button>
    </form>
  );
}

function IncomeForm({
  today,
  pending,
  onSave,
}: {
  today: string;
  pending?: boolean;
  onSave: (v: { amount_paise: number; source: string; note: string; received_on: string }) => void;
}) {
  const amount = useAmount();
  const [note, setNote] = useState("");
  const [source, setSource] = useState<string>("Salary");
  const [date, setDate] = useState(today);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (amount.paise) onSave({ amount_paise: amount.paise, source, note, received_on: date });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          <AmountInput value={amount.raw} onChange={amount.setRaw} />
        </Field>
        <Field label="From">
          <select className={selectClass} value={source} onChange={(e) => setSource(e.target.value)}>
            {INCOME_SOURCES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Note" hint="Optional">
        <Input placeholder="October salary" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="Received on">
        <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!amount.paise || !date}>
        Add income
      </Button>
    </form>
  );
}

function BillForm({
  today,
  pending,
  onSave,
}: {
  today: string;
  pending?: boolean;
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
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!title.trim() || !due || (amount.raw !== "" && !amount.paise)}>
        Add bill
      </Button>
    </form>
  );
}

function BudgetForm({ pending, onSave }: { pending?: boolean; onSave: (v: { category: string; limit: number }) => void }) {
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
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!amount.paise}>
        Set budget
      </Button>
    </form>
  );
}

function GoalForm({
  today,
  pending,
  onSave,
}: {
  today: string;
  pending?: boolean;
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
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!title.trim() || !amount.paise}>
        Make goal
      </Button>
    </form>
  );
}

function AmountForm({
  label,
  submit,
  pending,
  onSave,
}: {
  label: string;
  submit: string;
  pending?: boolean;
  onSave: (paise: number) => void;
}) {
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
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!amount.paise}>
        {submit}
      </Button>
    </form>
  );
}
