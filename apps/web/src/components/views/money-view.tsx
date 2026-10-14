"use client";

import { MoneyBoard } from "@/features/money/money-board";
import { TodayGate } from "./today-gate";

export function MoneyView() {
  return <TodayGate>{({ today }) => <MoneyBoard today={today} />}</TodayGate>;
}
