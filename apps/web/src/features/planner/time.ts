import type { TimeBlock } from "@/features/calendar/api";

/** The timetable runs from FIRST_HOUR to the end of LAST_HOUR. */
export const FIRST_HOUR = 6;
export const LAST_HOUR = 23;
export const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

const pad = (n: number) => String(n).padStart(2, "0");

/** "14:30:00" becomes "2:30 pm"; whole hours drop the minutes. */
export function clock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h % 24 >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${pad(m)} ${suffix}` : `${h12} ${suffix}`;
}

export const hourLabel = (hour: number) => clock(`${pad(hour)}:00`);

/** The timetable row an entry sits in. Entries outside the visible hours land in the nearest row. */
export function rowOf(block: TimeBlock): number {
  return Math.min(LAST_HOUR, Math.max(FIRST_HOUR, Number(block.starts_at.slice(0, 2))));
}

/** The start and end written for an entry typed into an hour's row. */
export function slotTimes(hour: number) {
  return { starts_at: `${pad(hour)}:00`, ends_at: hour === LAST_HOUR ? "23:59" : `${pad(hour + 1)}:00` };
}

/** True when an entry covers exactly the hour it sits in, so no time range needs showing. */
export function fillsRow(block: TimeBlock): boolean {
  const slot = slotTimes(rowOf(block));
  return block.starts_at.slice(0, 5) === slot.starts_at && block.ends_at.slice(0, 5) === slot.ends_at;
}
