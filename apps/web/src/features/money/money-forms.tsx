"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/field";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, rupeesToPaise } from "@/lib/money";
import { addDays } from "@/lib/dates";
import type { Recurrence } from "./api";
import { RECURRENCE_LABEL } from "./money-parts";

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

export function ExpenseForm({
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

export function IncomeForm({
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

export function BillForm({
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

export function BudgetForm({ pending, onSave }: { pending?: boolean; onSave: (v: { category: string; limit: number }) => void }) {
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

export function GoalForm({
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

export function AmountForm({
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
