import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/dates";
import type { Recurrence } from "@/features/money/api";

export type CalendarTask = { id: string; title: string; due_date: string; is_priority: boolean; completed_at: string | null };
export type TimeBlock = { id: string; title: string; block_date: string; starts_at: string; ends_at: string };
export type CalendarBill = { id: string; title: string; amount_paise: number | null; due_date: string; recurrence: Recurrence };
export type CalendarMove = { id: string; activity: string; session_date: string; duration_s: number };

/** Everything dated inside one month grid. Only tasks and time blocks are required; the rest fill in when present. */
export type MonthData = {
  tasks: CalendarTask[];
  blocks: TimeBlock[];
  bills: CalendarBill[];
  moods: { date: string; mood: number }[];
  journal: { date: string; words: number }[];
  spend: { date: string; paise: number }[];
  moves: CalendarMove[];
  focus: { date: string; minutes: number }[];
};

/** The Monday-first weeks that cover a month (YYYY-MM), always six rows so the page never jumps. */
export function monthGrid(month: string) {
  const first = `${month}-01`;
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const from = addDays(first, -weekday);
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  return { from, to: days[41], days };
}

export const calendarKey = (month: string) => ["calendar", month];

type Result<T> = { data: T[] | null; error: { message: string } | null };

/** Side data never blocks the calendar: a missing table or a failed read just shows nothing for that layer. */
function soft<T>(r: Result<T>): T[] {
  return r.error ? [] : (r.data ?? []);
}

function hard<T>(r: Result<T>): T[] {
  if (r.error) throw new Error(r.error.message);
  return r.data ?? [];
}

/** Adds whole months, holding the day of the month where it fits (31 Jan → 28 Feb). */
function addMonths(date: string, n: number, day = Number(date.slice(8))) {
  const [y, m] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return t.toISOString().slice(0, 10);
}

/** Each date a bill falls on between `from` and `to`, counting forward from its next due date. */
export function billDates(bill: CalendarBill, from: string, to: string): string[] {
  const out: string[] = [];
  const day = Number(bill.due_date.slice(8));
  for (let d = bill.due_date, i = 0; d <= to && i < 60; i++) {
    if (d >= from) out.push(d);
    if (bill.recurrence === "once") break;
    d =
      bill.recurrence === "weekly"
        ? addDays(bill.due_date, 7 * (i + 1))
        : addMonths(bill.due_date, (bill.recurrence === "yearly" ? 12 : 1) * (i + 1), day);
  }
  return out;
}

export async function fetchMonth(month: string): Promise<MonthData> {
  const supabase = createClient();
  const { from, to } = monthGrid(month);
  const [tasks, blocks, bills, checkins, journal, expenses, moves, focus] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,title,due_date,is_priority,completed_at")
      .is("deleted_at", null)
      .gte("due_date", from)
      .lte("due_date", to)
      .order("is_priority", { ascending: false })
      .order("created_at"),
    supabase
      .from("time_blocks")
      .select("id,title,block_date,starts_at,ends_at")
      .gte("block_date", from)
      .lte("block_date", to)
      .order("starts_at"),
    supabase
      .from("bills")
      .select("id,title,amount_paise,due_date,recurrence")
      .is("deleted_at", null)
      .is("paid_at", null)
      .lte("due_date", to),
    supabase.from("checkins").select("checkin_date,mood").gte("checkin_date", from).lte("checkin_date", to).not("mood", "is", null),
    supabase
      .from("journal_entries")
      .select("entry_date,word_count")
      .is("deleted_at", null)
      .gte("entry_date", from)
      .lte("entry_date", to),
    supabase.from("expenses").select("spent_on,amount_paise").is("deleted_at", null).gte("spent_on", from).lte("spent_on", to),
    supabase
      .from("fitness_sessions")
      .select("id,activity,session_date,duration_s")
      .gte("session_date", from)
      .lte("session_date", to)
      .order("started_at"),
    supabase.from("focus_sessions").select("session_date,minutes").gte("session_date", from).lte("session_date", to),
  ]);

  const sum = <T,>(rows: T[], date: (r: T) => string, n: (r: T) => number) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(date(r), (m.get(date(r)) ?? 0) + n(r));
    return [...m];
  };

  type Checkin = { checkin_date: string; mood: number };
  type Entry = { entry_date: string; word_count: number };
  type Expense = { spent_on: string; amount_paise: number };
  type Focus = { session_date: string; minutes: number };
  return {
    tasks: hard(tasks as Result<CalendarTask>),
    blocks: hard(blocks as Result<TimeBlock>),
    bills: soft(bills as Result<CalendarBill>),
    moods: soft(checkins as Result<Checkin>).map((c) => ({ date: c.checkin_date, mood: c.mood })),
    journal: sum(soft(journal as Result<Entry>), (e) => e.entry_date, (e) => e.word_count).map(([date, words]) => ({ date, words })),
    spend: sum(soft(expenses as Result<Expense>), (e) => e.spent_on, (e) => e.amount_paise).map(([date, paise]) => ({ date, paise })),
    moves: soft(moves as Result<CalendarMove>),
    focus: sum(soft(focus as Result<Focus>), (f) => f.session_date, (f) => f.minutes).map(([date, minutes]) => ({ date, minutes })),
  };
}

export async function addTaskOn(title: string, date: string) {
  const { error } = await createClient().from("tasks").insert({ title: title.trim(), due_date: date });
  if (error) throw new Error(error.message);
}

/** Moving a task drops its priority flag, so the target day never exceeds three. */
export async function moveTask(id: string, date: string) {
  const { error } = await createClient().from("tasks").update({ due_date: date, is_priority: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addBlock(v: { title: string; block_date: string; starts_at: string; ends_at: string }) {
  const { error } = await createClient().from("time_blocks").insert({ ...v, title: v.title.trim() });
  if (error) throw new Error(error.message);
}

export async function deleteBlock(id: string) {
  const { error } = await createClient().from("time_blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
